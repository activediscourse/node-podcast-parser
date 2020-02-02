# podcast-parser

Parses a podcast RSS feed and returns easy to use object

## installation

```
yarn add @activediscourse/podcast-parser
```

## usage

Pass a string containing XML source:

```js
const parsePodcast = require('@activediscourse/podcast-parser')

parsePodcast('<podcast xml>')
  .then(feed => console.log(feed))
  .catch(e => console.error(e))
```

This library only handles parsing, so you'll need to fetch the feed
separately first. For example, using [node-fetch][node-fetch] (or
[fetch][fetch] in the browser):

```js
const fetch = require('node-fetch')
const parsePodcast = require('@activediscourse/podcast-parser')

;(async () => {
  const response = await fetch("https://pinecast.com/feed/activediscourse")
  const xml = await response.text()
  const feed = await parsePodcast(xml)

  return feed
})()
  .then(feed => console.log(feed))
  .catch(e => console.error(e))
```

## output format

The output is opinionated with the goal of normalizing results across feeds:

```json
{
  "title": "<Podcast title>",
  "description": {
    "short": "<Podcast subtitle>",
    "long": "<Podcast description>"
  },
  "link": "<Podcast link (usually website for podcast)>",
  "image": "<Podcast image>",
  "language": "<ISO 639 language>",
  "copyright": "<Podcast copyright>",
  "updated": "<pubDate or latest episode pubDate>",
  "explicit": "<Podcast is explicit, true/false>",
  "categories": [
    "Category>Subcategory"
  ],
  "author": "<Author name>",
  "owner": {
    "name":  "<Owner name>",
    "email": "<Owner email>"
  },
  "episodes": [
    {
      "guid": "<Unique id>",
      "title": "<Episode title>",
      "subtitle": "<Episode subtitle>",
      "description": "<Episode description>",
      "rawDescription": "<Episode description stripped of HTML tags>",
      "explicit": "<Episode is is explicit, true/false>",
      "image": "<Episode image>",
      "published": "<date>",
      "duration": 120,
      "categories": [
        "Category"
      ],
      "enclosure": {
        "filesize": 5650889,
        "type": "audio/mpeg",
        "url": "<mp3 file>"
      }
    }
  ]
}
```

## notes

### language

Many podcasts have the language set something like `en`. A best effort attempt
is made to normalize language strings to an [IETF language code][IETF], so for
example `en` will be converted to `en-us`. Non-English languages will be presented
for example as `de-DE`.

### normalization

Not all feeds can be guaranteed to contain all properties, so they are simply
ommited from the output in that case.

Episode categories are included as an empty array if the podcast isn't
assigned any categories.

Episodes are sorted in descending order by publish date.

## development



## license

MIT © Bo Lingen / citycide

Based on [`node-podcast-parser`][node-podcast-parser], also MIT, © Antti Kupila.

See [license](license)

[fetch]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
[node-fetch]: https://github.com/node-fetch/node-fetch
[node-podcast-parser]: https://github.com/akupila/node-podcast-parser
[IETF]: https://en.wikipedia.org/wiki/IETF_language_tag
