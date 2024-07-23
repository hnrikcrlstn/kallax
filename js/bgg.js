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
    fetchGames();
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
async function fetchGames() {
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
            const timeOut = setTimeout(fetchGames, 500)
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
        gameCell.setAttribute('data-playtime-min' , game.stats.minplaytime);
        gameCell.setAttribute('data-playtime-max' , game.stats.maxplaytime);
        gameCell.setAttribute('data-players-min', game.stats.minplayers);
        gameCell.setAttribute('data-players-max', game.stats.maxplayers);
        gameCell.setAttribute('data-random' , Math.floor(Math.random() * 10000));
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
    const gameLinkData =  extractKeywords(game.item);
    /* Recommended player counts */
    if (game.item.minplayers.value == game.item.maxplayers.value) {
        $('.gameModal-players .data').text(game.item.minplayers.value);
    } else {
        /* If not fixed player count, fetch recommended player count */
        $('.gameModal-players .data').text(game.item.minplayers.value + '-' + game.item.maxplayers.value + ' (best at ' + fetchPlayerCount(game.item) + ')');
    }
    if (game.item.minplaytime.value == game.item.maxplaytime.value) {
        $('.gameModal-time .data').text(game.item.minplaytime.value + ' min');
    } else {
        $('.gameModal-time .data').text(game.item.minplaytime.value + '-' + game.item.maxplaytime.value + ' min (avg ' + game.item.playingtime.value + ' min)');
    }
    $('.gameModal-box a.bgg-link').attr({'href': 'https://boardgamegeek.com/boardgame/' + game.item.id , 'target': '_blank'});
    $('.gameModal-name').text(game.item.name.length > 1 ? game.item.name[0].value : game.item.name.value );
    $('.gameModal-description').text(decodeEntities(game.item.description));
    $('.gameModal-image').attr('src', (game.item.image != 'undefined' ? game.item.image : '#'));
    $('.gameModal-weight .data').text((game.item.statistics.ratings.averageweight.value * 1).toFixed(2));
    $('.gameModal-score-player .data').text(document.getElementById(game.item.id).getAttribute('data-user-score'));
    $('.gameModal-score-bgg .data').text((game.item.statistics.ratings.average.value * 1).toFixed(2));
    $('.gameModal-last-played .data').text(await fetchLastPlayed(game.item.id));
    $('.gameModal-keywords .data').text(gameLinkData.keywords);
    $('.gameModal-background').attr('data-visible' , 1).fadeIn('150ms');
    if (gameLinkData.expansions.length > 0) {
        fetchSpecificExpansion(gameLinkData.expansions);
    }
}

async function toggleModal(id) {
    $('.gameModal-expansions .gameModal-expansion-item').remove();
    if ($('.gameModal-background').attr('data-visible') == 0) {
        populateModal(await fetchSpecificGame(id));
    } else {
        resetModal();
    }
}

/* Fetch all data on specific game */
async function fetchSpecificGame(boardGameId) {
    try {
        const result = $.xml2json(await $.ajax({
            url: api_url + '/thing?id=' + boardGameId + '&stats=1',
            dataType: 'text',
            type: 'GET',
            crossDomain: true
        }));
        return result;
    } catch(error) {
        console.error('Error from fetchSpecificGame, id: ' + boardGameId + '. ' , error);
        throw error;
    }
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

async function fetchSpecificExpansion(expansions) {
    const delayDuration = expansions.length > 10 ? expansions.length * 250 : expansions.length * 150;
    let x = 0;
    $('.gameModal-loading').fadeIn('1000ms');
    for (const exp of expansions) {
        if (x > 50 || $('.gameModal-background').attr('data-visible') == "0" || $('.gameModal-expansion-item').length > 15) {
            break;
        }
        x++;
        try {
            const expansionData = await fetchSpecificGame(exp);
            let expansionName = expansionData.item.name.length > 1 ? expansionData.item.name[0].value : expansionData.item.name.value;
            expansionName = cleanBadCharacters(expansionName.replace($('.gameModal-name').text(), ''));
            if (showExpansionInListing(expansionName)) {
                const expansionPrice = ownedExpansions.includes(exp) ? null : await fetchGamePrice(exp);
                const expansionCell = $('<div class="gameModal-expansion-item" id="' + exp + '">' +
                    '<div class="gameModal-expansion-image-container">' +
                    '<a href="https://boardgamegeek.com/boardgame/' + expansionData.item.id + '" target="_blank" class="bgg-link">' +
                    '<img class="gameModal-expansion-image ' +  (ownedExpansions.includes(exp) ? 'gameModal-expansions-owned' : 'gameModal-expansions-notOwned') + '" src="' + (expansionData.item.thumbnail ? expansionData.item.thumbnail : '/img/image-not-found-icon.webp') + '">' +
                    '</a>' +
                    '</div>' +
                    '<a href="https://boardgamegeek.com/boardgame/' + expansionData.item.id + '" target="_blank" class="bgg-link">' +
                    '<h4 class="gameModal-expansion-name ' +  (ownedExpansions.includes(exp) ? 'gameModal-expansions-owned' : 'gameModal-expansions-notOwned') + '">' + expansionName + '</h4>' +
                    '</a>' +
                    '<a target="_blank" class="gameModal-expansion-price' + (ownedExpansions.includes(exp) ? ' gameModal-expansions-owned' : ' gameModal-expansions-notOwned') + (expansionPrice === null ? ' hidden"' : '"') + ' href="' + (expansionPrice === null ? '#' : expansionPrice.url.split('?')[0]) + '">' + (expansionPrice === null ? 'N/A' : '<img src="/img/cart.svg" class="gameModal-expansion-cart"> ' + (expansionPrice.prices.length ? currencyFormat.format(Math.floor(expansionPrice.prices[0].price)) : 'N/A')) + '</a>' +
                    '</div>');
                $('.gameModal-expansions').append(expansionCell);
            }
        } catch (error) {
            console.error('Error fetching expansion data, id: ' + exp + '. ' , error);
            throw error;
        }
        if ($('.gameModal-expansion-item').length) {
            $('.gameModal-expansion-header').show();
        };
        delay(delayDuration);
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
    let expansions = new Array();
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
            expansions.push(parseInt(boardLink.id));
        }
    });
    expansions.sort(function (a, b) {
        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
    });
    return {'keywords' : keywords.join(', '), 'expansions': expansions}
}

function fetchPlayerCount(item) {
    let votes = 0;
    item.poll.forEach(poll => {
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

function resetModal() {
    $('.gameModal-background').attr('data-visible' , 0);
    $('.gameModal-background').fadeOut('50ms');
    setTimeout(function() {
        $('.gameModal-name, .gameModal-description, .gameModal-box .data').text('');
        $('.gameModal-image').attr('src' , '');
        $('.gameModal-expansions .gameModal-expansion-item').remove();
        $('.gameModal-expansion-header').hide();
        $('.gameModal-loading').hide();
    }, 300);
}

function cleanBadCharacters(name) {
    let badCharacters = [' ', '–', '-', ':', '.', ','];
    let nameFix = false;
    while (!nameFix) {
        if (badCharacters.includes(name[0])) {
            name = name.substring(1);
        } else {
            nameFix = true;
        }
    }
    return name;
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

function decodeEntities(encodedString) {
    var textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
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
        case('random'):
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