# Kallax
A way to display your boardgame collection with data straight from [Boardgamegeek](https://boardgamegeek.com).
Set the default username in `js/bgg.js` or use `?user=[username]` as a URL-parameter.

[Preview](https://kallax.carlstein.dev)

## Installation
In `js/bgg.js`, replace `bggUserName` with your username from Boardgamegeek.

### External resources
* BGG XML API2 from [Boardgamegeek](https://boardgamegeek.com/wiki/page/BGG_XML_API2). All boardgame info is fetched from and owned by BoardGameGeek.
* Lazyloading plugin from [afarkas](https://afarkas.github.io/lazysizes/)
* Background image from [toptal/Subtlepatterns](https://www.toptal.com/designers/subtlepatterns/what-the-hex-dark/)
* xml2json from [Fyneworks](http://www.fyneworks.com)
* [Brädspelspriser API](https://bradspelspriser.se/api/plugin)
* [jQuery](https://jquery.com/)

## To dos
- [x] List a whole collection
- [x] Fetch and display play dates
- [x] Show owned expansions
- [x] Show not owned expansions
- [x] Show loading spinner while expansions is being fetched
- [x] Show lowest available price for expansions not currently owned
- [x] Add sorting and filtering
- [x] Mobile styling
- [ ] Show recommendations for new games
- [ ] Slider for expansions in game modal
- [ ] Fetch play dates on whole collection without overloading BGG API