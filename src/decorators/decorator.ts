import { promisify } from "util";
import { exec } from "child_process";
import { StoriesBrowser, StoryPreviewBrowser, Story } from "storycrawler";

export class CrawlerDecorator {
  constructor() {}

  protected promisifiedExec = promisify(exec);

  async prepare(): Promise<void> {}

  async check(_storiesBrowser: StoriesBrowser) {}

  async checkIterably(
    _previewBrowser: StoryPreviewBrowser,
    story: Story
  ): Promise<void> {
    console.log(`story名:${story.story}`);
  }

  async cleanUp(_storiesBrowser: StoriesBrowser): Promise<void> {}
}
