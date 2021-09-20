import { Story, StoryPreviewBrowser } from "storycrawler";
import { promisify } from "util";
import { exec } from "child_process";
import * as mkdirp from "mkdirp";
import vnuJarPath from "vnu-jar";
import { readFileSync } from "fs";

export class CrawlerDecorator {
  constructor() {}

  protected promisifiedExec = promisify(exec);

  async check(_browser: StoryPreviewBrowser, story: Story): Promise<void> {
    console.log(`story名:${story.story}`);
    console.log("デフォルトのデコレーター");
  }
}

//#region vnuの実行結果のフォーマットにjsonを指定したときの型
//https://github.com/validator/validator/wiki/Output-%C2%BB-JSON
interface VnuResultObject {
  messages: VnuMessageObject[];
  url?: string;
  source?: VnuSourceObject;
  language?: string;
}

interface VnuMessageObject {
  type: "info" | "error" | "non-document-error";
  subtype?: "warning" | "fatal" | "io" | "schema" | "internal";
  message?: string;
  extract?: string;
  offset?: number;
  url?: string;
  firstLine?: number;
  secondLine?: number;
  firstColumn?: number;
  secondColumn?: number;
}

interface VnuSourceObject {
  code: string;
  type?: string;
  encoding?: string;
}
//#endregion

export class CrawlerVnuDecorator extends CrawlerDecorator {
  constructor(private baseDecorator: CrawlerDecorator) {
    super();
  }

  async check(browser: StoryPreviewBrowser, story: Story): Promise<void> {
    this.baseDecorator.check(browser, story);

    console.log("VNUのデコレーター");
    const directory = "test/vnu";
    await mkdirp.default(directory);

    const html = await this.getHtml(browser);
    const tmpJson = `${directory}/tmp.json`;
    await this.promisifiedExec(
      `echo '${html}' | java -jar ${vnuJarPath} --exit-zero-always --format json - > ${tmpJson} 2>&1`
    );

    const result = this.filterNgAttributeErrors(
      JSON.parse(readFileSync(tmpJson, "utf8"))
    );
    if (result) {
      await this.promisifiedExec(
        `echo '${JSON.stringify(result)}' > ./test/vnu/${story.id}.json`
      );
    }
  }

  private async getHtml(browser: StoryPreviewBrowser): Promise<string> {
    // 直接pageのhtmlをvnuに掛けると、Storybookのスクリプトやスタイルでエラーが出る
    // なので、コンポーネントのHTMLだけを取出してチェックする
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

  private filterNgAttributeErrors(
    resultObject: VnuResultObject
  ): VnuResultObject | undefined {
    const messages = resultObject.messages.filter((message) => {
      if (!message || !message.message) {
        return true;
      }

      if (message.message.includes("ngcontent")) {
        return false;
      }

      return !message.message.includes("ng-reflect");
    });

    return messages.length > 0
      ? {
          messages,
        }
      : undefined;
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
