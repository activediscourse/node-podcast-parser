"use strict"

const sax = require("sax")

const languageRegex = /\w\w-\w\w/i
const htmlTagRegex = /<(?:.|\n)*?>/gm

const stripHtml = str =>
  str.replace(htmlTagRegex, "")

const isExplicit = text =>
  ({ explicit: (text || "").toLowerCase() === "yes" })

const setPath = (obj, keys, value) => {
  if (typeof keys === "string") {
    return setPath(obj, keys.split("."), value)
  } else if (keys.length === 1) {
    return (obj[keys[0]] = value)
  } else {
    const [head, ...tail] = keys
    if (!obj[head]) {
      obj[head] = {}
    }
    return setPath(obj[head], tail, value)
  }
}

const parseLanguage = text => {
  let lang = text
  if (!languageRegex.test(text)) {
    if (lang === "en") {
      lang = "en-US"
    } else {
      // e.g. `de-DE`
      lang = `${lang}-${lang.toUpperCase()}`
    }
  }

  return { language: lang.toLowerCase() }
}

const parseDuration = text =>
  text.split(":").reverse().reduce((acc, val, index) => {
    const steps = [60, 60, 24]
    let muliplier = 1

    while (index--) {
      muliplier *= steps[index]
    }

    return acc + parseInt(val) * muliplier
  }, 0)

const defaultOptions = {
  trim: true,
  lowercase: true
}

module.exports = (feedXml, parserOptions = {}) =>
  new Promise((resolve, reject) => {
    const parser = sax.parser(true, {
      ...defaultOptions,
      ...parserOptions
    })

    const result = {
      categories: []
    }

    let node = null
    let tmpEpisode

    parser.onopentag = nextNode => {
      node = {
        name: nextNode.name,
        attributes: nextNode.attributes,
        parent: node
      }

      if (!node.parent) {
        return
      }

      if (node.name === "channel") {
        // root channel
        node.target = result
        node.textMap = {
          title: true,
          link: true,
          language: text => parseLanguage(text),
          "itunes:author": "author",
          "itunes:subtitle": "description.short",
          description: "description.long",
          ttl: text => ({ ttl: parseInt(text) }),
          pubDate: text => ({ updated: new Date(text) }),
          "itunes:explicit": isExplicit,
          "itunes:type": "type"
        }
      } else if (node.name === "itunes:image" && node.parent.name === "channel") {
        result.image = node.attributes.href
      } else if (node.name === "itunes:owner" && node.parent.name === "channel") {
        result.owner = node.target = {}
        node.textMap = {
          "itunes:name": "name",
          "itunes:email": "email"
        }
      } else if (node.name === "itunes:category") {
        const path = [node.attributes.text]
        let tmp = node.parent
        // go up to fill in parent categories
        while (tmp && tmp.name === "itunes:category") {
          path.unshift(tmp.attributes.text)
          tmp = tmp.parent
        }

        const lastCategoryIndex = result.categories.length - 1
        if (result.categories[lastCategoryIndex] === path[0]) {
          // overwrite last category because this one is more specific
          result.categories[lastCategoryIndex] = path.join(">")
        } else {
          result.categories.push(path.join(">"))
        }
      } else if (node.name === "item" && node.parent.name === "channel") {
        tmpEpisode = {}

        node.target = tmpEpisode
        node.textMap = {
          title: true,
          guid: true,
          "itunes:summary": "description.primary",
          "itunes:subtitle": "subtitle",
          description: "description.alternate",
          pubDate: text => ({ published: new Date(text) }),
          "itunes:duration": text => ({
            // parse '1:03:13' into 3793 seconds
            duration: parseDuration(text)
          }),
          "itunes:season": "season",
          "itunes:episode": "episode",
          "itunes:episodeType": "episodeType",
          "itunes:explicit": isExplicit
        }
      } else if (tmpEpisode) {
        // episode specific attributes
        if (node.name === "itunes:image") {
          // episode image
          tmpEpisode.image = node.attributes.href
        } else if (node.name === "enclosure") {
          tmpEpisode.enclosure = {
            filesize: node.attributes.length ? parseInt(node.attributes.length) : undefined,
            type: node.attributes.type,
            url: node.attributes.url
          }
        }
      }
    }

    parser.onclosetag = name => {
      node = node.parent

      if (tmpEpisode && name === "item") {
        if (!result.episodes) {
          result.episodes = []
        }
        // coalesce descriptions (no breaking change)
        let description = ""
        if (tmpEpisode.description) {
          description = tmpEpisode.description.primary || tmpEpisode.description.alternate || ""
        }
        tmpEpisode.description = description
        tmpEpisode.rawDescription = stripHtml(description)
        result.episodes.push(tmpEpisode)
        tmpEpisode = null
      }
    }

    parser.ontext = parser.oncdata = text => {
      text = text.trim()
      if (text.length === 0) {
        return
      }

      if (!node || !node.parent) {
        // this should never happen but it's here as a safety net
        // I guess this might happen if a feed was incorrectly formatted
        return
      }

      if (node.parent.textMap) {
        const key = node.parent.textMap[node.name]
        if (key) {
          if (typeof key === "function") {
            // value preprocessor
            Object.assign(node.parent.target, key(text))
          } else {
            const keyName = key === true ? node.name : key
            const prevValue = node.parent.target[keyName]
            // ontext can fire multiple times, if so append to previous value
            // this happens with "text &amp; other text"
            setPath(node.parent.target, keyName, prevValue ? `${prevValue} ${text}` : text)
          }
        }
      }

      if (tmpEpisode && node.name === "category") {
        if (!tmpEpisode.categories) {
          tmpEpisode.categories = []
        }
        tmpEpisode.categories.push(text)
      }
    }

    parser.onend = () => {
      // sort by date descending
      if (result.episodes) {
        result.episodes = result.episodes.sort((item1, item2) => {
          return item2.published.getTime() - item1.published.getTime()
        })
      }

      if (!result.updated) {
        if (result.episodes && result.episodes.length > 0) {
          result.updated = result.episodes[0].published
        } else {
          result.updated = null
        }
      }

      result.categories = [...new Set(result.categories)]

      resolve(result)
    }

    // annoyingly sax also emits an error
    // https://github.com/isaacs/sax-js/pull/115
    try {
      parser.write(feedXml).close()
    } catch (error) {
      reject(error)
    }
  })
