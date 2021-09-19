import {
  createExecutionService,
  MetricsWatcher,
  StoriesBrowser,
  Story,
  StorybookConnection,
  StoryPreviewBrowser,
} from "storycrawler";
import { CrawlerDecorator } from "./decorator";
import { cpus } from "os";

export class Crawler {
  constructor(private decorator: CrawlerDecorator) {}

  public async crawl(storybookUrl: string): Promise<void> {
    const connection = await new StorybookConnection({
      storybookUrl,
    }).connect();
    const storiesBrowser = await new StoriesBrowser(connection).boot();
    const stories = await storiesBrowser.getStories();

    const numberOfWorkers = cpus().length / 2; // メモリを使いすぎるとフリーズするので、使えるプロセスの半分にしておく
    const browsers = await Promise.all(
      Array.from({ length: numberOfWorkers }, (_, index) => index).map((_, i) =>
        new StoryPreviewBrowser(connection, i).boot()
      )
    );

    try {
      await this.createService(browsers, stories).execute();
    } finally {
      await storiesBrowser.close();
      await Promise.all(browsers.map((browser) => browser.close()));
      await connection.disconnect();
    }
  }

  private createService(browsers: StoryPreviewBrowser[], stories: Story[]) {
    return createExecutionService(
      browsers,
      stories,
      (story) => async (browser) => {
        await browser.setCurrentStory(story);
        await new MetricsWatcher(browser.page).waitForStable();
        this.decorator.check(browser, story);
      }
    );
  }
}
