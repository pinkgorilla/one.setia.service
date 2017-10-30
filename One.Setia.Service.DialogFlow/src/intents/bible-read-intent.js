const fetch = require("node-fetch");
const volumes = require("./bible-volumes");
const action = /^bible-read/i;
const Intent = require("./intent");

class BibleReadIntent extends Intent {
    constructor() {
        super(action);
    }

    getResponse(data) {
        var parameter = this.getParameter(data);
        var action = data.result.action;

        if (action === "bible-read-more")
            parameter.page += 1;

        return this.getVerses(parameter)
            .then(verses => {
                var outMore = {
                    "name": "bible-read-more",
                    "lifespan": 5,
                    "parameters": parameter
                };
                var outVersion = Object.assign({}, outMore);
                outVersion.name = "bible-read-version";

                return {
                    "speech": verses,
                    "displayText": verses,
                    "data": {},
                    "source": "bible-webhook",
                    "contextOut": [outMore, outVersion]
                };
            })
            .catch((e) => {
                return {
                    "speech": e,
                    "displayText": e,
                    "data": { demo: 10 },
                    "source": "bible-webhook",
                    "contextOut": []
                };
            });
    }

    getVerses(parameter) {
        var book = volumes.get(parameter.book);

        if (parameter.chapter > book.chapters.size)
            return Promise.reject(`the book of ${book.name} only contains ${book.chapters.size} chapters`);
        else {
            var chapter = book.chapters.get(parameter.chapter);

            var from = parameter.from;
            var to = parameter.to;
            var size = parameter.size || 10;
            var page = parameter.page;

            from = parameter.from + (page - 1) * size;
            to = from + size - 1;
            to = to > parameter.to ? parameter.to : to;

            if (from >= parameter.to && page > 1) {
                var pageOffset = parseInt((from - parameter.to) / size, 10);
                pageOffset = parameter.from === parameter.to ? pageOffset - 1 : pageOffset;
                from = parameter.to + 1 + pageOffset * size;
                to = from + size - 1;
            }
            // user loads more when end of chapter reached;
            if (from > chapter.length) {
                if (book.chapters.size >= parameter.chapter + 1) {
                    parameter.chapter++;
                    parameter.from = 1;
                    parameter.to = size;
                    parameter.page = 1;
                    from = parameter.from;
                    to = parameter.to;
                    chapter = book.chapters.get(parameter.chapter);
                }
                else {
                    return Promise.reject(`You have reach the end of book of ${book.name}.`);
                }
            }
            // user loads more when requested end verse reached;

            to = to > chapter.length ? chapter.length : to;
            parameter.offset = to;

            var header = `[${parameter.version.join("-")}] ${book.name} chapter ${parameter.chapter}/${book.chapters.size} verse ${from} - ${to} of ${chapter.length} verses.\n`;
            var footer = `\nsay next to show more...\npowered by bible.is`;

            var results = parameter.version.map((version, vIndex) => {
                var damId = `${version}${book.volume}2ET`;
                var uri = `http://dbt.io/text/verse?key=${process.env.BIBLEIS_ACCESSTOKEN}&dam_id=${damId}&book_id=${parameter.book}&chapter_id=${parameter.chapter}&verse_start=${from}&verse_end=${to}&v=2`;
                return fetch(uri)
                    .then(result => result.json());
            });

            return Promise.all(results)
                .then(json => {
                    var merged = [].concat.apply([], json).sort((a, b) => {
                        var aId = parseInt(a.verse_id, 10);
                        var bId = parseInt(b.verse_id, 10);
                        if (aId <= bId)
                            return -1;
                        else
                            return 1;
                    });

                    return [].concat.apply([], [
                        [header],
                        [].concat.apply([], merged.map(verse => `${verse.verse_id}. ${verse.verse_text}`)), [footer]
                    ]).join("\n");
                });
        }
    }

    getParameter(data) {
        var defaultSize = 10;
        var parameters = data.result.parameters;
        var bible = data.result.parameters.bible || {};
        var version = parameters.version.length == 0 ? ["INZNTV"] : parameters.version;
        var book = bible.book || parameters.book;
        var chapter = Math.abs(parseInt(bible.chapter || parameters.chapter || 1, 10));
        var page = parseInt(parameters.page || 1, 10);

        var xFrom = Math.abs(parseInt(bible["verse-start"] || parameters.from, 10));
        xFrom = isNaN(xFrom) ? 0 : xFrom;
        var from = xFrom < 1 ? 1 : xFrom;
        var to = Math.abs(parseInt(bible["verse-end"] || parameters.to || (page === 1 && xFrom ? from : (from + defaultSize - 1)) || 1, 10));
        var arr = [from, to].sort((a, b) => a - b);


        var size = parameters.size ? parseInt(parameters.size, 10) : null;
        var offset = parameters.offset ? parseInt(parameters.offset, 10) : null;

        return {
            "version": version,
            "book": book,
            "chapter": chapter,
            "from": arr[0],
            "to": arr[1],
            "page": page,
            "size": size,
            "offset": offset
        };
    }
}

module.exports = BibleReadIntent;
