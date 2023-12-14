import {defineMarkdocConfig, nodes, component} from '@astrojs/markdoc/config';
import prism from '@astrojs/markdoc/prism';

export default defineMarkdocConfig({
    extends: [prism()],
    nodes: {
        heading: {
            ...nodes.heading,
            render: component("./src/components/blog/Heading.astro"),
        }
    },
    tags: {
        youtube: {
            render: component("./src/components/blog/YouTubeEmbed.astro"),
            attributes: {
                url: {type: "String"},
                label: {type: "String"},
            },
        },
        tweet: {
            render: component("./src/components/blog/TweetEmbed.astro"),
            attributes: {
                url: {type: "String"},
            },
        },
        codepen: {
            render: component("./src/components/blog/CodePenEmbed.astro"),
            attributes: {
                url: {type: "String"},
                title: {type: "String"},
            },
        },
        githubgist: {
            render: component("./src/components/blog/GitHubGistEmbed.astro"),
            attributes: {
                id: {type: "String"}
            },
        },
        bilibili: {
            render: component("./src/components/blog/BilibiliEmbed.astro"),
            attributes: {
                bvid: {type: "String"},
            },
        }
    }
});