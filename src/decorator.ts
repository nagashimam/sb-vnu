import { Story, StoryPreviewBrowser } from "storycrawler";
import { promisify } from "util";
import { exec } from "child_process";
import * as mkdirp from "mkdirp";

export class CrawlerDecorator {
  constructor() {}

  protected promisifiedExec = promisify(exec);

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
    await mkdirp.default("test/lighthouse");

    console.log(`Lighthouseのデコレーター:${browser.page.url()}`);
    const outputPath = `./test/lighthouse/${story.id}.json`;
    const res = await this.promisifiedExec(
      `npx lighthouse ${browser.page.url()} --output json --output-path ${outputPath}`
    );
    console.log("res", res.stdout);
    console.error("error", res.stderr);
  }
}
