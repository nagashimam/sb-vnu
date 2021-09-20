import { StoriesBrowser } from "storycrawler";
import vnuJarPath from "vnu-jar";
import mkdirp from "mkdirp";
import rimraf from "rimraf";
import { CrawlerDecorator } from "./decorator";

export class CrawlerScssDecorator extends CrawlerDecorator {
  private readonly directory = "test/vnu/scss";

  constructor(private baseDecorator: CrawlerDecorator) {
    super();
  }

  async prepare(): Promise<void> {
    this.baseDecorator.prepare();
    await mkdirp(this.directory);
    await new Promise<void>((resolve, _) => {
      rimraf(`${this.directory}/*.json`, () => resolve());
    });
    await this.promisifiedExec("npx sass src --no-source-map");
  }

  async check(_storiesBrowser: StoriesBrowser): Promise<void> {
    const outputPath = `${this.directory}/css-validator.json`;
    await this.promisifiedExec(
      `java -jar ${vnuJarPath} --exit-zero-always --format json --skip-non-css src - > ${outputPath} 2>&1`
    );
  }

  async cleanUp(_storiesBrowser: StoriesBrowser): Promise<void> {
    await new Promise<void>((resolve, _) => {
      rimraf(`src/*.css`, () => resolve());
    });
  }
}
