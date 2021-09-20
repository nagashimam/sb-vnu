import { Story, StoryPreviewBrowser } from "storycrawler";
import mkdirp from "mkdirp";
import rimraf from "rimraf";
import { CrawlerDecorator } from "./decorator";

export class CrawlerLighthouseDecorator extends CrawlerDecorator {
  private readonly directory = "test/lighthouse";

  constructor(private baseDecorator: CrawlerDecorator) {
    super();
  }

  async prepare(): Promise<void> {
    this.baseDecorator.prepare();
    const promise = new Promise<void>((resolve, _) => {
      rimraf(`${this.directory}/*.json`, () => resolve());
    });
    await promise;
  }

  async checkIterably(
    previewBrowser: StoryPreviewBrowser,
    story: Story
  ): Promise<void> {
    this.baseDecorator.checkIterably(previewBrowser, story);
    console.log(`Lighthouseによるチェック:${previewBrowser.page.url()}`);

    await mkdirp(this.directory);
    const outputPath = `./${this.directory}/${story.id}.json`;
    await this.promisifiedExec(
      `npx lighthouse ${previewBrowser.page.url()} --output json --output-path ${outputPath}`
    );
  }
}
