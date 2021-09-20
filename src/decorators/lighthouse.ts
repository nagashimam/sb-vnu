import { Story, StoryPreviewBrowser } from "storycrawler";
import mkdirp from "mkdirp";
import { CrawlerDecorator } from "./decorator";

export class CrawlerLighthouseDecorator extends CrawlerDecorator {
  constructor(private baseDecorator: CrawlerDecorator) {
    super();
  }

  async checkIterably(
    previewBrowser: StoryPreviewBrowser,
    story: Story
  ): Promise<void> {
    this.baseDecorator.checkIterably(previewBrowser, story);

    console.log(`Lighthouseのデコレーター:${previewBrowser.page.url()}`);
    await mkdirp("test/lighthouse");
    const outputPath = `./test/lighthouse/${story.id}.json`;
    await this.promisifiedExec(
      `npx lighthouse ${previewBrowser.page.url()} --output json --output-path ${outputPath}`
    );
  }
}
