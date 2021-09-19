import meow from "meow";

const cli = meow("help message", {
  flags: {
    storybookUrl: {
      type: "string",
    },
  },
});

console.log(cli.flags.storybookUrl);
