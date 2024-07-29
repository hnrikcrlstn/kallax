/* Change this var to your Boardgamegeek username */
var bggUserName = 'hcarl';
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('user')) {
    bggUserName = urlParams.get('user');
}

/* Global variables related to sending boardgamedata between functions */
var ownedExpansions = new Array();
var ownedBoardGames = new Array();

const api_url = 'https://boardgamegeek.com/xmlapi2/';
const api_price_url = 'https://bradspelspriser.se/api/info?currency=sek&destination=SE&delivery=PACKAGE,OFFCE,PICKUPBOX,POSTOFFICE,LETTER&preferred_language=GB&eid=';

const currencyFormat = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
})

/* Fetch game collection when page has loaded */
$(document).ready(function() {
    fetchAllGames();
    fetchAllExpansions();
})

/* Event listeners */
$(document).on('click', '.game-cell', function() {
    toggleModal($(this).attr('id'));
});
$(document).on('click', '.gameModal-background, .gameModal-close', function(e) {
    if (e.target == this) {
        resetModal();
    }
});
$(document).on('click', '.header-sub-menu-checkbox, .reset', function() {
    if ($(this).prop('checked')) {
        $('.header-sub-menu-checkbox').prop('checked', false);
        $(this).prop('checked', true);
    }
});

/* This fetches all base game, which will be displayed in the grid */
async function fetchAllGames() {
    $.ajax({
        url: api_url + 'collection?username=' + bggUserName + '&stats=1&excludesubtype=boardgameexpansion',
        dataType: 'text',
        type: 'GET',
        crossDomain: true
    }).done(function(data, statusText, XHR) {
        if (XHR.status == 200) {
            for (let i = 0; i < $.xml2json(data).item.length; i++) {
                ownedBoardGames.push(parseInt($.xml2json(data).item[i].objectid));
            }
            populateGrid($.xml2json(data));
        } else {
            /*
            Sometimes BGG needs to rebuild their cache with a user collection
            This makes sure the collection is fetched without sending too many request to the BGG API 
            */
            const timeOut = setTimeout(fetchAllGames, 500)
        }
    })
}

/* To be able to shown owned expansions, a separate GET needs to fetch a users expansions */
async function fetchAllExpansions() {
    $.ajax({
        url: api_url + 'collection?username=' + bggUserName + '&stats=1&subtype=boardgameexpansion',
        dataType: 'text',
        type: 'GET',
        crossDomain: true
    }).done(function(data, statusText, XHR) {
        if (XHR.status == 200) {
            expansions = $.xml2json(data);
            for (let i = 0; i < expansions.item.length; i++) {
                ownedExpansions.push(parseInt(expansions.item[i].objectid));
            }
        } else {
            /*
            Sometimes BGG needs to rebuild their cache with a user collection
            This makes sure the collection is fetched without sending too many request to the BGG API 
            */
            const timeOut = setTimeout(fetchAllExpansions, 500)
        }
    })
}

async function populateGrid(games) {
    $('.game-grid-loading').fadeOut('fast');
    /* Create a new game cell for each game in collection */
    for (const game of games.item) {
        /* Handle single data (only 2 players, only 30 min playtimes) responses */
        const playerCount = game.stats.maxplayers == game.stats.minplayers ? game.stats.maxplayers : game.stats.minplayers + '-' + game.stats.maxplayers;
        const playTime = game.stats.minplaytime == game.stats.maxplaytime ? game.stats.minplaytime : game.stats.minplaytime + '-' + game.stats.maxplaytime;
        const userScore = game.stats.rating.value == "N/A" ? 0 : game.stats.rating.value;
        
        let gameCell = document.createElement('div');
        gameCell.className = 'game-cell';
        gameCell.id = game.objectid;
        gameCell.setAttribute('data-game-name', game.name.toLowerCase());
        gameCell.setAttribute('data-score-user' , userScore == "N/A" ? 0 : userScore * 100);
        gameCell.setAttribute('data-score-bgg' , game.stats.rating.average.value * 100);
        gameCell.setAttribute('data-rating-bgg', game.stats.rating.ranks.rank.constructor === Array ? game.stats.rating.ranks.rank.find(x => x.id == "1").value : game.stats.rating.ranks.rank.value);
        gameCell.setAttribute('data-playtime-min' , game.stats.minplaytime);
        gameCell.setAttribute('data-playtime-max' , game.stats.maxplaytime);
        gameCell.setAttribute('data-players-min', game.stats.minplayers);
        gameCell.setAttribute('data-players-max', game.stats.maxplayers);
        gameCell.innerHTML = '<div class="game-name">' +
            '<h3>' + game.name + '</h3>' + 
            '</div>' +
            '<div class="game-cover">' +
            '<div class="game-score-container" style="right: 10px">'+
            '<div class="game-bgg-score game-score" style="background-position: ' + game.stats.rating.average.value * 10 + '% bottom">' + parseFloat(game.stats.rating.average.value).toFixed(2) + '</div>' +
            '</div>' +
            '<div class="game-score-container" style="left: 10px">' +
            '<div class="game-user-score game-score" style="background-position: ' + userScore * 10 + '% bottom">' + game.stats.rating.value + '</div>' +
            '</div>' +
            '<div class="game-cover-image"><img class="lazyload" src="' + game.thumbnail + '" data-src="' + game.image + '"></div>' + 
            '</div></div>' +
            '<div class="game-data">' + 
            '<div class="game-data-row">' +
            '<div>' + playerCount + '</div>' +
            '<div>' + playTime + ' min</div>' +
            '</div>' +
            '<div class="game-data-row game-header-row">' +
            '<div>Players</div><div>Play time</div>' +
            '</div></div>';
        $('.game-grid').append(gameCell);
    };
}

async function populateModal(game) {
    const gameLinkData =  extractKeywords(game[0]);
    /* Recommended player counts */
    if (game[0].minplayers.value == game[0].maxplayers.value) {
        $('.gameModal-players .data').text(game[0].minplayers.value);
    } else {
        /* If not fixed player count, fetch recommended player count */
        $('.gameModal-players .data').text(game[0].minplayers.value + '-' + game[0].maxplayers.value + ' (best at ' + fetchPlayerCount(game[0]) + ')');
    }
    if (game[0].minplaytime.value == game[0].maxplaytime.value) {
        $('.gameModal-time .data').text(game[0].minplaytime.value + ' min');
    } else {
        $('.gameModal-time .data').text(game[0].minplaytime.value + '-' + game[0].maxplaytime.value + ' min (avg ' + game[0].playingtime.value + ' min)');
    }
    $('.gameModal-box a.bgg-link').attr({'href': 'https://boardgamegeek.com/boardgame/' + game[0].id , 'target': '_blank'});
    $('.gameModal-name').text(game[0].name.length > 1 ? game[0].name[0].value : game[0].name.value );
    $('.gameModal-description').text(decodeString(game[0].description));
    $('.gameModal-image').attr('src', (game[0].image != 'undefined' ? game[0].image : '#'));
    $('.gameModal-weight .data').text((game[0].statistics.ratings.averageweight.value * 1).toFixed(2));
    $('.gameModal-score-player .data').text(Number(document.getElementById(game[0].id).getAttribute('data-score-user')) / 100);
    $('.gameModal-score-bgg .data').text((Number(game[0].statistics.ratings.average.value)).toFixed(2));
    $('.gameModal-last-played .data').text(await fetchLastPlayed(game[0].id));
    $('.gameModal-keywords .data').text(gameLinkData.keywords);
    $('.gameModal-background').attr('data-visible' , 1).fadeIn('150ms');
    if (gameLinkData.expansions.length > 0) {
        $('.gameModal-loading').fadeIn('500ms');
        populateExpansions(gameLinkData.expansions);
    }
}

/* Fetch all data on specific game or games */
async function fetchSpecificGames(boardGameId) {
    let result = new Array();
    result.item = new Array()
    let x = 0;
    while (x <= boardGameId.length) {
        try {
            const partResult = $.xml2json(await $.ajax({
                url: api_url + '/thing?id=' + boardGameId.slice(x, x + 20) + '&stats=1',
                dataType: 'text',
                type: 'GET',
                crossDomain: true
            }));
            result.item.push(partResult.item);
        } catch(error) {
            console.error('Error from fetchSpecificGames, id: ' + boardGameId.slice(x, x + 20) + '. ' , error);
            throw error;
        }
        x += 20;
        delay(200);
    }
    return result.item.flat();
}

async function fetchGamePrice(boardGameId) {
    try {
        const result = await $.ajax({
            url: api_price_url + boardGameId,
            dataType: 'JSON',
            type: 'GET',
            crossDomain: true
        });
        if (result.items.length > 0) {
            return result.items[0];
        } else {
            return null;
        }
    } catch(error) {
        console.error('Error from fetchGamePrice, id: ' + boardGameId + '. ' , error);
        throw error;
    }
}

async function populateExpansions(allExpansionsIds) {
    const rawExpansionData = await fetchSpecificGames(allExpansionsIds);
    let expansionData = Array.isArray(rawExpansionData) ? rawExpansionData : [rawExpansionData];
    for (const currentExpansion of expansionData) {
        if ($('.gameModal-background').attr('data-visible') == "0") {
            break;
        }
        try {
            let expansionName = currentExpansion.name.length > 1 ? currentExpansion.name[0].value : currentExpansion.name.value;
            expansionName = cleanBadCharacters(expansionName.replace($('.gameModal-name').text(), ''));
            if (showExpansionInListing(expansionName)) {
                const expansionPrice = ownedExpansions.includes(Number(currentExpansion.id)) ? null : await fetchGamePrice(currentExpansion.id);
                const expansionCell = $('<div class="gameModal-expansion-item" id="' + currentExpansion.id + '">' +
                    '<div class="gameModal-expansion-image-container">' +
                    '<a href="https://boardgamegeek.com/boardgame/' + currentExpansion.id + '" target="_blank" class="bgg-link">' +
                    '<img class="gameModal-expansion-image ' +  (ownedExpansions.includes(Number(currentExpansion.id)) ? 'gameModal-expansions-owned' : 'gameModal-expansions-notOwned') + '" src="' + (currentExpansion.thumbnail ? currentExpansion.thumbnail : '/img/image-not-found-icon.webp') + '">' +
                    '</a>' +
                    '</div>' +
                    '<a href="https://boardgamegeek.com/boardgame/' + currentExpansion.id + '" target="_blank" class="bgg-link">' +
                    '<h4 class="gameModal-expansion-name ' +  (ownedExpansions.includes(Number(currentExpansion.id)) ? 'gameModal-expansions-owned' : 'gameModal-expansions-notOwned') + '">' + expansionName + '</h4>' +
                    '</a>' +
                    '<a target="_blank" class="gameModal-expansion-price' + (ownedExpansions.includes(Number(currentExpansion.id)) ? ' gameModal-expansions-owned' : ' gameModal-expansions-notOwned') + (expansionPrice === null ? ' hidden"' : '"') + ' href="' + (expansionPrice === null ? '#' : expansionPrice.url.split('?')[0]) + '">' + (expansionPrice === null ? 'N/A' : '<img src="/img/cart.svg" class="gameModal-expansion-cart"> ' + (expansionPrice.prices.length ? currencyFormat.format(Math.floor(expansionPrice.prices[0].price)) : 'N/A')) + '</a>' +
                    '</div>');
                $('.gameModal-expansions').append(expansionCell);
            }
        } catch (error) {
            console.error('Error fetching expansion data, id: ' + currentExpansion.id + '. ' , error);
            throw error;
        }
        if ($('.gameModal-expansion-item').length) {
            $('.gameModal-expansion-header').show().find('h4').attr({'data-expansions': $('.gameModal-expansion-item').length, 'data-expansions-owned': $('.gameModal-expansion-name.gameModal-expansions-owned').length});
        };
    }
    $('.gameModal-loading').fadeOut('250ms');
}

async function fetchLastPlayed(boardGameId) {
    try {
        const result = $.xml2json(await $.ajax({
            url: api_url + 'plays?username=' + bggUserName + '&stats=1&id=' + boardGameId,
            type: 'GET',
            crossDomain: true
        }));
        if (result.play) {
            return result.play.date ? result.play.date : result.play[0].date;
        } else {
            return '-';
        }
    } catch(error) {
        console.error('Error from fetchLastPlayed, id: ' + boardGameId + '. ' , error);
        throw error;
    }
}

function extractKeywords(gameData) {
    let keywords = new Array();
    let expansionsIds = new Array();
    let keywordsCounter = 0;
    let mechanicsCounter = 0;
    gameData.link.forEach(boardLink => {
        if (boardLink.type == "boardgamecategory") {
            if (keywordsCounter < 2) {
                keywords.push(boardLink.value);
            }
            keywordsCounter++;
        } else if (boardLink.type == 'boardgamemechanic'){
            if (mechanicsCounter < 2) {
                keywords.push(boardLink.value);
            }
            mechanicsCounter++;
        } else if (boardLink.type == 'boardgameexpansion') {
            expansionsIds.push(parseInt(boardLink.id));
        }
    });
    expansionsIds.sort(function (a, b) {
        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
    });
    return {'keywords' : keywords.join(', '), 'expansions': expansionsIds}
}

function fetchPlayerCount(game) {
    let votes = 0;
    game.poll.forEach(poll => {
        if (poll.name == "suggested_numplayers") {
            poll.results.forEach(result => {
                /* Votes for best playrange */
                if (Number(result.result[0].numvotes) >= votes) {
                    bestPlayerCount = result.numplayers;
                    votes = Number(result.result[0].numvotes);
                }
            })
        }
    })
    return bestPlayerCount;
}

async function toggleModal(boardGameId) {
    $('.gameModal-expansions .gameModal-expansion-item').remove();
    if ($('.gameModal-background').attr('data-visible') == 0) {
        populateModal(await fetchSpecificGames(boardGameId));
    } else {
        resetModal();
    }
}

function resetModal() {
    $('.gameModal-background').attr('data-visible' , 0);
    $('.gameModal-background').fadeOut('50ms');
    setTimeout(function() {
        $('.gameModal-expansion-header h4').attr({'data-expansions': 0, 'data-expansions-owned': 0})
        $('.gameModal-name, .gameModal-description, .gameModal-box .data').text('');
        $('.gameModal-image').attr('src' , '');
        $('.gameModal-expansions .gameModal-expansion-item').remove();
        $('.gameModal-expansion-header').hide();
        $('.gameModal-loading').hide();
    }, 300);
}

function cleanBadCharacters(gameName) {
    let badCharacters = [' ', '–', '-', ':', '.', ','];
    let nameFix = false;
    while (!nameFix) {
        if (badCharacters.includes(gameName[0])) {
            gameName = gameName.substring(1);
        } else {
            nameFix = true;
        }
    }
    return gameName;
}

function showExpansionInListing(expansionName) {
    const ignorableNames = ["promo", "fan exp", "mini-tournament"];
    let showExpansion = true;
    for (names of ignorableNames) {
        if (expansionName.toLowerCase().includes(names)) {
            showExpansion = false;
        }
    }
    return showExpansion;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function decodeString(encodedString) {
    let decoder = document.createElement('textarea');
    decoder.innerHTML = encodedString;
    return decoder.value;
}

function initiateSort(sortBy) {
    let sortedGames = false;
    const sortAsc = sortOrderUpdate(sortBy);
    const sortObj = $('.game-grid').children('.game-cell');
    switch (sortBy) {
        case('name'):
            sortedGames = sortGames(sortObj, 'data-game-name', sortAsc, 'alph');
            break;
        case('ranking-bgg'):
            sortedGames = sortGames(sortObj, 'data-score-bgg', sortAsc, 'num');
            break;
        case('ranking-user'):
            sortedGames = sortGames(sortObj, 'data-score-user', sortAsc, 'num');
            break;
        case('rank-bgg'):
            sortedGames = sortGames(sortObj, 'data-rating-bgg', !sortAsc, 'num');
            break;
        case('random'):
            randomizeSortSeed();
            sortedGames = sortGames(sortObj, 'data-random', sortAsc, 'num');
            break;
        case('playtime'):
            sortedGames = sortGames(sortObj, 'data-playtime-max', sortAsc, 'num');
            break;
        default:
            filterGames(sortBy);
    }
    if (sortedGames) {
        $('.game-grid').prepend(sortedGames);
        $('header li.sort, header label.sort').each(function() {
            $(this).toggleClass('nav-active', $(this).hasClass(sortBy));
        })
    }
}

function sortOrderUpdate(sortBy) {
    if ($('.game-grid').attr('data-sort') == sortBy && $('.game-grid').attr('data-sort-direction') == 'asc') {
        $('.game-grid').attr('data-sort-direction', 'desc');
        return false;
    }
    $('.game-grid').attr('data-sort' , sortBy);
    $('.game-grid').attr('data-sort-direction', 'asc');
    return true;
}

function sortGames(sortObj, sortAttr, sortDirection, sortType) {
    let sort = Array.prototype.sort.bind(sortObj);
    sort(function(a, b) {
        let gameA = a.getAttribute(sortAttr);
        let gameB = b.getAttribute(sortAttr);
        if (sortType == 'num') {
            gameA = parseInt(gameA);
            gameB = parseInt(gameB);
        }
        if (gameA < gameB) {
            return sortDirection ? 1 : -1;
        }
        if (gameA > gameB) {
            return sortDirection ? -1 : 1;
        }
        return 0;
    })
    return sortObj
}

function filterGames(filterBy) {
    $('header li.filter').each(function() {
        $(this).toggleClass('nav-active', $(this).hasClass(filterBy));
    })
    if (filterBy.includes('playcount')) {
        $('header .player-count label').addClass('nav-active');
        const numberPlayers = filterBy.split('_')[1];
        if (numberPlayers != $('header .reset').attr('filtered')) {
            $('header .reset').removeClass('hidden').attr('filtered' , numberPlayers);
            for (const game of $('.game-grid').children('.game-cell')) {
                if (numberPlayers == 'more') {
                    $(game).toggle(Number($(game).attr('data-players-max')) > 7);
                } else {
                    $(game).toggle(Number($(game).attr('data-players-min')) <= numberPlayers && Number($(game).attr('data-players-max')) >= numberPlayers);
                }
            }
        }
    } else {
        $('.game-grid .game-cell').toggle(true);
        $('header .player-count label').removeClass('nav-active');
        $('header .reset').addClass('hidden');
    }
}

function randomizeSortSeed() {
    $('.game-cell').each(function() {
        $(this).attr('data-random', Math.floor(Math.random() * 10000));
    })
}