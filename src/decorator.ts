import { Story, StoryPreviewBrowser } from "storycrawler";
import { promisify } from "util";
import { exec } from "child_process";
import * as mkdirp from "mkdirp";
import vnuJarPath from "vnu-jar";

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
    await mkdirp.default("test/vnu");

    const outputPath = `./test/vnu/${story.id}.json`;
    const html = await this.getHtml(browser);
    await this.promisifiedExec(
      `echo '${html}' | java -jar ${vnuJarPath} --exit-zero-always --format json - > ${outputPath} 2>&1`
    );
  }

  private async getHtml(browser: StoryPreviewBrowser): Promise<string> {
    const storyRoot = await await browser.page.$eval(
      "#root",
      (elm) => elm.innerHTML
    );
    return `
<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<body>
  ${storyRoot} 
</body>

</html>

    `;
  }
}

export class CrawlerLighthouseDecorator extends CrawlerDecorator {
  constructor(private baseDecorator: CrawlerDecorator) {
    super();
  }

  async check(browser: StoryPreviewBrowser, story: Story): Promise<void> {
    this.baseDecorator.check(browser, story);

    console.log(`Lighthouseのデコレーター:${browser.page.url()}`);
    await mkdirp.default("test/lighthouse");
    const outputPath = `./test/lighthouse/${story.id}.json`;
    const res = await this.promisifiedExec(
      `npx lighthouse ${browser.page.url()} --output json --output-path ${outputPath}`
    );
    console.log("res", res.stdout);
    console.error("error", res.stderr);
  }
}
