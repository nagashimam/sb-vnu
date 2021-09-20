import { StoriesBrowser, Story, StoryPreviewBrowser } from "storycrawler";
import { promisify } from "util";
import { exec } from "child_process";
import * as mkdirp from "mkdirp";
import vnuJarPath from "vnu-jar";
import { readFileSync } from "fs";
import * as rimraf from "rimraf";

export class CrawlerDecorator {
  constructor() {}

  protected promisifiedExec = promisify(exec);

  async check(storiesBrowser: StoriesBrowser) {
    console.log(`storybookUrl:${storiesBrowser.page.url()}`);
  }

  async checkIterably(
    _previewBrowser: StoryPreviewBrowser,
    story: Story
  ): Promise<void> {
    console.log(`story名:${story.story}`);
  }

  async cleanUp(_storiesBrowser: StoriesBrowser): Promise<void> {}
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
  private readonly directory = "test/vnu";

  constructor(private baseDecorator: CrawlerDecorator) {
    super();
  }

  async checkIterably(
    previewBrowser: StoryPreviewBrowser,
    story: Story
  ): Promise<void> {
    this.baseDecorator.checkIterably(previewBrowser, story);
    console.log("HTML構文チェック");

    await mkdirp.default(this.directory);

    const html = await this.extractComponentHtmlFromIframe(previewBrowser);
    const tmpJson = `${this.directory}/tmp${story.id}.json`;
    await this.promisifiedExec(
      `echo '${html}' | java -jar ${vnuJarPath} --exit-zero-always --format json - > ${tmpJson} 2>&1`
    );

    const result = this.excludeNgAttributeErrorsFromResult(
      JSON.parse(readFileSync(tmpJson, "utf8"))
    );
    if (result) {
      await this.promisifiedExec(
        `echo '${JSON.stringify(result)}' > ./test/vnu/${story.id}.json`
      );
    }
  }

  async cleanUp(_storiesBrowser: StoriesBrowser): Promise<void> {
    const promise = new Promise<void>((resolve, _) => {
      rimraf.default(`${this.directory}/tmp*.json`, () => resolve());
    });
    await promise;
  }

  private async extractComponentHtmlFromIframe(
    previewBrowser: StoryPreviewBrowser
  ): Promise<string> {
    // 直接pageのhtmlをvnuに掛けると、Storybookのスクリプトやスタイルでエラーが出る
    // なので、コンポーネントのHTMLだけを取出してチェックする
    const storyRoot = await previewBrowser.page.$eval(
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

  private excludeNgAttributeErrorsFromResult(
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

  async checkIterably(
    previewBrowser: StoryPreviewBrowser,
    story: Story
  ): Promise<void> {
    this.baseDecorator.checkIterably(previewBrowser, story);

    console.log(`Lighthouseのデコレーター:${previewBrowser.page.url()}`);
    await mkdirp.default("test/lighthouse");
    const outputPath = `./test/lighthouse/${story.id}.json`;
    await this.promisifiedExec(
      `npx lighthouse ${previewBrowser.page.url()} --output json --output-path ${outputPath}`
    );
  }
}
