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
    await mkdirp(this.directory);
    await new Promise<void>((resolve, _) => {
      rimraf(`${this.directory}/*.json`, () => resolve());
    });
  }

  async checkIterably(
    previewBrowser: StoryPreviewBrowser,
    story: Story
  ): Promise<void> {
    this.baseDecorator.checkIterably(previewBrowser, story);
    console.log(`Lighthouseによるチェック:${previewBrowser.page.url()}`);

    const outputPath = `./${this.directory}/${story.id}.json`;
    const threeSecondInMs = 3000;
    const clearId = setInterval(() => {
      console.log(`${story.story}のチェック中...`);
    }, threeSecondInMs);

    await this.promisifiedExec(
      `npx lighthouse ${previewBrowser.page.url()} --output json --output-path ${outputPath}`
    );
    clearInterval(clearId);
  }
}
