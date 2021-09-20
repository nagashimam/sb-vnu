import vnuJarPath from "vnu-jar";
import { readFileSync } from "fs";

import mkdirp from "mkdirp";
import rimraf from "rimraf";
import { StoryPreviewBrowser, Story, StoriesBrowser } from "storycrawler";
import { CrawlerDecorator } from "./decorator";

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

export class CrawlerHtmlDecorator extends CrawlerDecorator {
  private readonly directory = "test/vnu/html";

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
    console.log("HTML構文チェック");

    const html = await this.extractComponentHtmlFromIframe(previewBrowser);
    const tmpJson = `${this.directory}/tmp${story.id}.json`;
    await this.promisifiedExec(
      `echo '${html}' | java -jar ${vnuJarPath} --exit-zero-always --format json - > ${tmpJson} 2>&1`
    );

    const result = this.excludeNgAttributeErrorsFromResult(
      JSON.parse(readFileSync(tmpJson, "utf8"))
    );
    if (result) {
      const outputPath = `./${this.directory}/${story.id}.json`;
      await this.promisifiedExec(
        `echo '${JSON.stringify(result)}' > ${outputPath}`
      );
    }
  }

  async cleanUp(_storiesBrowser: StoriesBrowser): Promise<void> {
    this.baseDecorator.cleanUp(_storiesBrowser);
    const promise = new Promise<void>((resolve, _) => {
      rimraf(`${this.directory}/tmp*.json`, () => resolve());
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
