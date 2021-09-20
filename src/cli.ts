import meow from "meow";
import {
  Crawler,
  CrawlerDecorator,
  CrawlerLighthouseDecorator,
  CrawlerHtmlDecorator,
  CrawlerScssDecorator,
} from ".";

const cli = meow("help message", {
  flags: {
    storybookUrl: {
      type: "string",
    },
    html: {
      type: "boolean",
    },
    scss: {
      type: "boolean",
    },
    lighthouse: {
      type: "boolean",
    },
  },
});

console.log(cli.flags.storybookUrl);

if (!cli.flags.storybookUrl) {
  console.log("Storybook URLを指定してください");
  process.exit(1);
}

let decorator = new CrawlerDecorator();
if (cli.flags.html) {
  decorator = new CrawlerHtmlDecorator(decorator);
}
if (cli.flags.lighthouse) {
  decorator = new CrawlerLighthouseDecorator(decorator);
}
if (cli.flags.scss) {
  decorator = new CrawlerScssDecorator(decorator);
}

const crawler = new Crawler(decorator);
crawler.crawl(cli.flags.storybookUrl as string).then(() => process.exit(0));
