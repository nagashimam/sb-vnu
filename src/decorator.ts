import { Story, StoryPreviewBrowser } from "storycrawler";

export class CrawlerDecorator {
  constructor() {}

  async check(_browser: StoryPreviewBrowser, story: Story): Promise<void> {
    console.log(`story名:${story.story}`);
    console.log("デフォルトのデコレーター");
  }
}

export class CrawlerVnuDecorator extends CrawlerDecorator {
  constructor(private baseDecorator: CrawlerDecorator) {
    super();
  }

  async check(browser: StoryPreviewBrowser, story: Story): Promise<void> {
    this.baseDecorator.check(browser, story);
    console.log("VNUのデコレーター");
  }
}

export class CrawlerLighthouseDecorator extends CrawlerDecorator {
  constructor(private baseDecorator: CrawlerDecorator) {
    super();
  }

  async check(browser: StoryPreviewBrowser, story: Story): Promise<void> {
    this.baseDecorator.check(browser, story);
    console.log("Lighthouseのデコレーター");
  }
}
