// 1. Import utilities from `astro:content`
import {defineCollection} from 'astro:content';
import {blog, project} from "../lib/frontmatter.schema";

// 2. Define a `type` and `schema` for each collection
const blogCollection = defineCollection({
    type: 'content', // v2.5.0 and later
    schema: blog,
});

const projectCollection = defineCollection({
    type: "content",
    schema: project,
});

// 3. Export a single `collections` object to register your collection(s)
export const collections = {
    'blog': blogCollection,
    'projects': projectCollection,
};