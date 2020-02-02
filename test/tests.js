"use strict"

const test = require("ava")
const { basename, resolve } = require("path")
const { readdirSync, readFileSync } = require("fs")

const parse = require("../src/index")

const fixturePath = resolve(__dirname, "fixtures")

const utcDate = (year, month, day, hour, minute, second) =>
  new Date(Date.UTC(year, month, day, hour, minute, second))

const hasProperty = (target, key) =>
  ({}.hasOwnProperty.call(target, key))

test.before("set up xml fixtures", t => {
  t.context = readdirSync(fixturePath, {
    withFileTypes: true
  }).reduce((context, file) => {
    if (!file.isFile()) {
      return context
    }

    const key = basename(file.name, ".xml")
    const content = readFileSync(resolve(fixturePath, file.name))

    return {
      ...context,
      [key]: content
    }
  }, {})
})

test("should return expected format", async t => {
  const data = await parse(t.context["apple-example"])

  t.true(hasProperty(data, "title"))
  t.true(hasProperty(data, "link"))
  t.true(hasProperty(data, "language"))
  t.true(hasProperty(data, "description"))
  t.true(hasProperty(data.description, "short"))
  t.true(hasProperty(data.description, "long"))
  t.true(hasProperty(data, "image"))
  t.true(hasProperty(data, "categories"))
  t.true(hasProperty(data, "author"))
  t.true(hasProperty(data, "owner"))
  t.true(hasProperty(data, "updated"))
  t.true(hasProperty(data, "explicit"))
  t.true(hasProperty(data, "episodes"))

  t.true(typeof data.title === "string")
  t.true(typeof data.title === "string")
  t.true(typeof data.link === "string")
  t.true(typeof data.language === "string")
  t.true(typeof data.description.short === "string")
  t.true(typeof data.description.long === "string")
  t.true(typeof data.image === "string")
  t.true(typeof data.explicit === "boolean")
  t.true(Array.isArray(data.categories))
  t.true(data.updated instanceof Date)
  t.true(Array.isArray(data.episodes))
  t.true(typeof data.author === "string")

  t.true(hasProperty(data.owner, "name"))
  t.true(hasProperty(data.owner, "email"))

  const [episode] = data.episodes
  t.true(hasProperty(episode, "guid"))
  t.true(hasProperty(episode, "title"))
  t.true(hasProperty(episode, "description"))
  t.true(hasProperty(episode, "published"))
  t.true(hasProperty(episode, "image"))
  t.true(hasProperty(episode, "duration"))
  t.true(hasProperty(episode, "explicit"))
  t.true(hasProperty(episode, "enclosure"))

  t.true(typeof episode.guid === "string")
  t.true(typeof episode.title === "string")
  t.true(typeof episode.description === "string")
  t.true(episode.published instanceof Date)
  t.true(typeof episode.image === "string")
  t.true(typeof episode.explicit === "boolean")
  t.true(typeof episode.duration === "number")

  t.true(hasProperty(episode.enclosure, "filesize"))
  t.true(hasProperty(episode.enclosure, "type"))
  t.true(hasProperty(episode.enclosure, "url"))
})

test("should parse apple feed", async t => {
  const data = await parse(t.context["apple-example"])

  const podcast = Object.assign({}, data)
  delete podcast.episodes

  t.deepEqual(podcast, {
    title: "All About Everything",
    description: {
      short: "A show about everything",
      long: "All About Everything is a show about everything. Each week we dive into any subject known to man and talk about it as much as we can. Look for our podcast in the Podcasts app or in the iTunes Store"
    },
    link: "http://www.example.com/podcasts/everything/index.html",
    image: "http://example.com/podcasts/everything/AllAboutEverything.jpg",
    language: "en-us",
    updated: utcDate(2014, 5, 15, 19, 0, 0),
    author: "John Doe",
    owner: {
      name: "John Doe",
      email: "john.doe@example.com"
    },
    explicit: true,
    categories: [
      "Technology>Gadgets",
      "TV & Film"
    ]
  })

  t.is(data.episodes.length, 3)
  const [firstEpisode] = data.episodes
  delete firstEpisode.description
  delete firstEpisode.rawDescription

  t.deepEqual(firstEpisode, {
    guid: "http://example.com/podcasts/archive/aae20140615.m4a",
    title: "Shake Shake Shake Your Spices",
    published: utcDate(2014, 5, 15, 19, 0, 0),
    subtitle: "A short primer on table spices",
    image: "http://example.com/podcasts/everything/AllAboutEverything/Episode1.jpg",
    duration: 424,
    explicit: false,
    enclosure: {
      filesize: 8727310,
      type: "audio/x-m4a",
      url: "http://example.com/podcasts/everything/AllAboutEverythingEpisode3.m4a"
    }
  })
})

test("should parse javascript air feed", async t => {
  const data = await parse(t.context["javascript-air"])

  const podcast = Object.assign({}, data)
  delete podcast.episodes

  t.deepEqual(podcast, {
    title: "JavaScript Air",
    description: {
      short: "The live broadcast podcast all about JavaScript",
      long: "The live broadcast podcast all about JavaScript and the Web"
    },
    link: "http://javascriptair.podbean.com",
    image: "http://imglogo.podbean.com/image-logo/862611/2048.png",
    language: "en-us",
    updated: utcDate(2016, 0, 28, 0, 21, 35),
    ttl: 1440,
    author: "Kent C. Dodds",
    owner: {
      name: "Kent C. Dodds",
      email: "javascriptair@gmail.com"
    },
    explicit: false,
    categories: [
      "Technology>Podcasting"
    ]
  })

  t.is(data.episodes.length, 8)
  const [firstEpisode] = data.episodes
  delete firstEpisode.description
  delete firstEpisode.rawDescription

  t.deepEqual(firstEpisode, {
    guid: "http://audio.javascriptair.com/e/007-jsair-chakra-microsofts-open-source-javascript-engine-with-ed-maurer-gaurav-seth-and-steve-lucco/",
    title: "007 jsAir - Chakra, Microsoft’s Open Source JavaScript Engine with Ed Maurer, Gaurav Seth, and Steve Lucco",
    subtitle: "Chakra, Microsoft's Open Source JavaScript Engine with Ed Maurer, Gaurav Seth, and Steve LuccoDescription:Microsoft has been making some pretty awesome\r\nmoves in the world of open ...",
    published: utcDate(2016, 0, 28, 0, 21, 35),
    // no image
    explicit: false,
    duration: 3550,
    enclosure: {
      filesize: 56787979,
      type: "audio/mpeg",
      url: "http://javascriptair.podbean.com/mf/feed/dk3eif/JavaScriptAirEpisode007-ChakraMicrosoftsOpenSourceJavaScriptEngine.mp3"
    },
    categories: [
      "Uncategorized"
    ]
  })
})

test("should parse scale your code feed", async t => {
  const data = await parse(t.context["scale-your-code"])

  const podcast = Object.assign({}, data)
  delete podcast.episodes

  t.deepEqual(podcast, {
    title: "Scale Your Code Podcast",
    description: {
      short: "Interviews of proven developers",
      long: "Learn from proven developers through interviews."
    },
    link: "https://scaleyourcode.com/",
    image: "http://d1ngwfo98ojxvt.cloudfront.net/public/itunes/cover_art.jpg",
    language: "en-us",
    updated: utcDate(2016, 1, 2, 1, 5, 26),
    author: "Christophe Limpalair",
    owner: {
      name: "Christophe Limpalair",
      email: "chris@scaleyourcode.com"
    },
    explicit: true,
    categories: [
      "Technology"
    ]
  })

  t.is(data.episodes.length, 23)
  const [firstEpisode] = data.episodes
  delete firstEpisode.description
  delete firstEpisode.rawDescription

  t.deepEqual(firstEpisode, {
    guid: "https://d1ngwfo98ojxvt.cloudfront.net/public/mp3/interviews/jack_levin_23.mp3",
    title: "Large scale image processing on the fly in 25ms with Google's first Network Engineer",
    subtitle: "We talk about his experience at Google, ImageShack, and how his engine can process images in 25ms on the cloud.",
    published: utcDate(2016, 1, 2, 1, 5, 26),
    image: "https://d1ngwfo98ojxvt.cloudfront.net/images/interviews/jack_levin/jack-levin_opt_hi.jpg",
    // no explicit
    // no duration
    enclosure: {
      filesize: undefined, // filesize not set
      type: "audio/x-mp3",
      url: "https://d1ngwfo98ojxvt.cloudfront.net/public/mp3/interviews/jack_levin_23.mp3"
    }
    // no categories
  })
})

test("should parse rtve-podcast feed", async t => {
  const data = await parse(t.context["rtve-podcast"])

  const podcast = Object.assign({}, data)
  delete podcast.episodes

  t.deepEqual(podcast, {
    title: "Tiempo de valientes. El diario de Julián Martínez",
    description: {
      long: "Al final del capítulo 9 de El Ministerio del Tiempo, vimos a Julián Martínez huir del ministerio por una puerta. ¿Qué sucedió con él? ¿Volverá? Descúbrelo en el diario sonoro de Julián Martínez en Cuba, la ficción sonora de RTVE.ES, Radio Nacional, Onza Entertainment y Cliffhanger TV protagonizada por Rodolfo Sancho."
    },
    link: "http://www.rtve.es/alacarta/audios/tiempo-de-valientes-el-diario-de-julian-martinez/",
    image: "http://img.rtve.es/imagenes/tiempo-valientes-diario-julian-martinez/1455556336980.jpg",
    language: "es-es",
    updated: utcDate(2016, 4, 17, 12, 8, 49),
    owner: {},
    explicit: false,
    categories: []
  })
})

test("should parse se-radio feed", async t => {
  const data = await parse(t.context["se-radio"])

  const podcast = Object.assign({}, data)
  delete podcast.episodes

  t.deepEqual(podcast, {
    title: "Software Engineering Radio - The Podcast for Professional Software Developers",
    description: {
      short: "Information for Software Developers and Architects",
      long: "Software Engineering Radio is a podcast targeted at the professional software developer. The goal is to be a lasting educational resource, not a newscast. Every 10 days, a new episode is published that covers all topics software engineering. Episodes are either tutorials on a specific topic, or an interview with a well-known character from the software engineering world. All SE Radio episodes are original content — we do not record conferences or talks given in other venues. Each episode comprises two speakers to ensure a lively listening experience. SE Radio is an independent and non-commercial organization. All content is licensed under the Creative Commons 2.5 license."
    },
    link: "http://www.se-radio.net",
    image: "http://media.computer.org/sponsored/podcast/se-radio/se-radio-logo-1400x1475.jpg",
    language: "en-us",
    updated: utcDate(2016, 0, 28, 18, 6, 52),
    author: "SE-Radio Team",
    owner: {
      name: "SE-Radio Team",
      email: "team@se-radio.net"
    },
    explicit: false,
    categories: [
      "Technology>Software How-To"
    ]
  })

  t.is(data.episodes.length, 249)
  const [firstEpisode] = data.episodes
  delete firstEpisode.description
  delete firstEpisode.rawDescription

  t.deepEqual(firstEpisode, {
    guid: "http://www.se-radio.net/?p=1939",
    title: "SE-Radio Episode 248: Axel Rauschmayer on JavaScript and ECMAScript 6",
    subtitle: "Johannes Thönes talks to author and speaker Axel Rauschmayer about JavaScript and ECMAScript 6. - They first talk about JavaScript’s origin and history. They discuss the standardization of ECMAScript and the version history. Then,",
    published: utcDate(2016, 0, 28, 18, 6, 52),
    image: "http://media.computer.org/sponsored/podcast/se-radio/se-radio-logo-1400x1475.jpg",
    explicit: false,
    duration: 3793,
    enclosure: {
      filesize: 151772209,
      type: "audio/mpeg",
      url: "http://feedproxy.google.com/~r/se-radio/~5/_V8a9ATpdxk/SE-Radio-Episode-248-Axel-Rauschmayer-on-JavaScript-and-ECMAScript-6.mp3"
    },
    categories: [
      "Episodes",
      "ECMAScript",
      "JavaScript"
    ]
  })
})

test("should parse design details feed", async t => {
  const data = await parse(t.context["design-details"])

  const podcast = Object.assign({}, data)
  delete podcast.episodes

  t.deepEqual(podcast, {
    title: "Design Details",
    description: {
      short: "A show about the people who design our favorite products.",
      long: "A show about the people who design our favorite products. Hosted by Bryn Jackson and Brian Lovin."
    },
    link: "http://spec.fm/show/design-details",
    image: "https://media.simplecast.com/podcast/image/1034/1452553074-artwork.jpg",
    language: "en-us",
    updated: utcDate(2016, 1, 1, 13, 0, 0),
    author: "Spec",
    owner: {
      name: "Spec.FM",
      email: "designdetailsfm@gmail.com"
    },
    explicit: false,
    categories: [
      "Technology",
      "Arts>Design",
      "Technology>Podcasting"
    ]
  })

  t.is(data.episodes.length, 102)
  const [firstEpisode] = data.episodes
  delete firstEpisode.description
  delete firstEpisode.rawDescription

  t.deepEqual(firstEpisode, {
    guid: "ea43eba3-3a9e-4593-a69b-1a78465d9e76",
    title: "100: Goldilocks Fidelity (feat. Daniel Burka)",
    subtitle: "Episode 100! We made it - thank you so much to everyone has listened to an episode, shared the show with a friend or reached out to us on Twitter this past year; we wouldn't be here without you. For this special episode we caught up with Daniel Burka to t",
    published: utcDate(2016, 1, 1, 13, 0, 0),
    image: "https://media.simplecast.com/episode/image/25164/1454282072-artwork.jpg",
    duration: 3932,
    explicit: true,
    enclosure: {
      filesize: 62948884,
      type: "audio/mpeg",
      url: "https://audio.simplecast.com/25164.mp3"
    }
    // no categories
  })
})

test("should parse neo4j feed", async t => {
  const data = await parse(t.context.neo4j)

  const podcast = Object.assign({}, data)
  delete podcast.episodes

  t.deepEqual(podcast, {
    title: "Podcast on Graph Databases and Neo4j",
    description: {
      short: "Podcast by The Neo4j Graph Database Community",
      long: "Podcast by The Neo4j Graph Database Community"
    },
    link: "http://blog.bruggen.com",
    image: "http://i1.sndcdn.com/avatars-000135096101-qekfg1-original.png",
    language: "en-us",
    ttl: 60,
    updated: utcDate(2016, 0, 29, 8, 44, 0),
    author: "The Neo4j Graph Database Community",
    owner: {
      name: "Graphistania",
      email: "rik@neotechnology.com"
    },
    explicit: false,
    categories: [
      "Technology"
    ]
  })

  t.is(data.episodes.length, 54)
  const [firstEpisode] = data.episodes
  delete firstEpisode.description
  delete firstEpisode.rawDescription

  t.deepEqual(firstEpisode, {
    guid: "tag:soundcloud,2010:tracks/244374452",
    title: "Podcast Interview With Stuart Begg And Matt Byrne, Independent Contractors at Sensis",
    subtitle: "Podcast Interview With Stuart Begg And Matt Byrne…",
    published: utcDate(2016, 0, 29, 0, 0, 0),
    image: "http://i1.sndcdn.com/avatars-000135096101-qekfg1-original.png",
    explicit: false,
    duration: 638,
    enclosure: {
      filesize: 6381794,
      type: "audio/mpeg",
      url: "http://www.podtrac.com/pts/redirect.mp3/feeds.soundcloud.com/stream/244374452-graphistania-podcast-recording-with-stuart-begg-and-matt-byrne-independent-contractors-at-sensis.mp3"
    }
    // no categories
  })
})

test("should parse iOS 11 feeds from coding blocks", async t => {
  const data = await parse(t.context["coding-blocks"])

  const podcast = Object.assign({}, data)
  delete podcast.episodes

  t.deepEqual(podcast, {
    categories: [],
    title: "Coding Blocks Podcast",
    description: {
      long: "The world of computer programming is vast in scope. There are literally thousands of topics to cover and no one person could ever reach them all. One of the goals of the Coding Blocks podcast is to introduce a number of these topics to the audience so they can learn during their commute or while cutting the grass. We will cover topics such as best programming practices, design patterns, coding for performance, object oriented coding, database design and implementation, tips, tricks and a whole lot of other things. You'll be exposed to broad areas of information as well as deep dives into the guts of a programming language. While Microsoft.NET is the development platform we're using, most topics discussed are relevant in any number of Object Oriented programming languages. We are all web and database programmers and will be providing useful information on a full spectrum of technologies and are open to any suggestions anyone might have for a topic. So please join us, subscribe, and invite your computer programming friends to come along for the ride."
    },
    link: "http://www.codingblocks.net/",
    language: "en-us",
    image: "https://ssl-static.libsyn.com/p/assets/4/d/e/0/4de099a806af9ddd/1400x1400bb.jpg",
    explicit: false,
    updated: utcDate(2018, 5, 11, 1, 20, 48),
    type: "episodic"
  })

  t.is(data.episodes.length, 83)
  const [firstEpisode] = data.episodes
  delete firstEpisode.description
  delete firstEpisode.rawDescription

  t.deepEqual(firstEpisode, {
    guid: "c964777d603943dab53f36ccc17a742e",
    title: "Search Driven Apps",
    subtitle: "We're talking databases, indexes, search engines, and why they're basically microwaves in this episode while Joe wears a polo, Allen's quick brown fox jumps over whatever, and Michael gives out fake URLs.",
    published: utcDate(2018, 5, 11, 1, 20, 48),
    image: "https://ssl-static.libsyn.com/p/assets/2/e/a/d/2ead1e2293797364/Coding_Blocks_-_Blockhead_Chipping.jpeg",
    enclosure: {
      filesize: 66692288,
      type: "audio/mpeg",
      url: "https://traffic.libsyn.com/secure/codingblocks/coding-blocks-episode-83.mp3?dest-id=171666"
    },
    duration: 8318,
    explicit: false,
    season: "1",
    episode: "83",
    episodeType: "full"
  })
})

test("should parse libsyn example feed episode", async t => {
  const data = await parse(t.context["libsyn-example-podcast"])

  const [firstEpisode] = data.episodes

  t.deepEqual(firstEpisode, {
    guid: "1bdba530eb7cd0fb6241a945fda4db95",
    title: "Episode 128",
    subtitle: "Frank and Erik travel the world. Outro: 20/20 - Yellow Pills 646-434-8528 frankanderik.com",
    published: utcDate(2017, 3, 21, 3, 12, 13),
    description: "<p>Frank and Erik travel the world.</p> <p>Outro: 20/20 - Yellow Pills</p> <p>646-434-8528</p> <p>frankanderik.com</p>",
    rawDescription: "Frank and Erik travel the world. Outro: 20/20 - Yellow Pills 646-434-8528 frankanderik.com",
    image: "http://static.libsyn.com/p/assets/0/a/0/1/0a015c5ace601833/InternetFamousArt.jpg",
    explicit: false,
    duration: 5702,
    enclosure: {
      filesize: 45813708,
      type: "audio/mpeg",
      url: "http://traffic.libsyn.com/frankanderik/Internet_Famous_Ep128.mp3?dest-id=30697"
    }
    // no categories
  })
})

test("should parse active discourse feed episode", async t => {
  const data = await parse(t.context["active-discourse"])

  const [firstEpisode] = data.episodes

  t.deepEqual(firstEpisode, {
    guid: "https://pinecast.com/guid/7b9254e2-8f80-4ba8-892c-8324e3dd3cb6",
    title: "CES 2020: Now I’m Thinking This is a Joke",
    description: "<p>Bo and Brett have opinions to share about the weird products that appeared at CES 2020. They discuss the small quality of life updates for the Nest Home hub, all the great Samsung TV’s, and the Razer Kishi. Closing the episode out, Bo reminds us of the very use case specific devices Charmin brought to CES. </p>\n\n<p>Please feel free to share your opinions, feedback, or topic requests to ActiveDiscourse@icloud.com</p>\n\n<p>PS- We are also curious to know what the industry standard alternative to Gmail is. Let us know!</p>",
    rawDescription: "Bo and Brett have opinions to share about the weird products that appeared at CES 2020. They discuss the small quality of life updates for the Nest Home hub, all the great Samsung TV’s, and the Razer Kishi. Closing the episode out, Bo reminds us of the very use case specific devices Charmin brought to CES. \n\nPlease feel free to share your opinions, feedback, or topic requests to ActiveDiscourse@icloud.com\n\nPS- We are also curious to know what the industry standard alternative to Gmail is. Let us know!",
    subtitle: "CES... Tis a Silly Place",
    published: utcDate(2020, 0, 20, 15, 40, 0),
    image: "https://storage.pinecast.net/podcasts/03e115b3-99ed-4561-a3ea-c8ddfc098f30/artwork/1b1076cd-9794-43fa-aa4c-7b82cba5c989/image.jpg",
    explicit: false,
    duration: 3580,
    enclosure: {
      filesize: 43267845,
      type: "audio/mpeg",
      url: "https://pinecast.com/listen/7b9254e2-8f80-4ba8-892c-8324e3dd3cb6.mp3?source=rss&ext=asset.mp3"
    },
    episode: "9"
  })
})

test("should parse isExplicit", async t => {
  const data = await parse(t.context["libsyn-example-podcast"])
  const podcast = Object.assign({}, data)
  const [firstEpisode] = data.episodes

  t.true(podcast.explicit)
  t.false(firstEpisode.explicit)
})

test("should parse complex genres", async t => {
  const data = await parse(t.context["complex-genre"])

  t.deepEqual(data.categories, [
    "A>A1",
    "A>A1>A11",
    "A>A1>A11>A111",
    "A>A2",
    "B>B1",
    "B>B2",
    "B>B2>B21"
  ])
})

test("should reject with error", async t => {
  await t.throwsAsync(() => parse("invalid xml"))
})
