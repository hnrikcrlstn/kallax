/* Change this var to your Boardgamegeek username */
var bggUserName = 'hcarl';

/* Global variables related to sending boardgamedata between functions */
var expansions = {};
var boardGames = {};
var specificGame = {};

const api_url = 'https://boardgamegeek.com/xmlapi2/';

/* Fetch game collection when page has loaded */
$(document).ready(function() {
    fetchGames();
    fetchAllExpansions();

    /* Force only one sub menu open at a time */
    $('.header-sub-menu-checkbox').on('click', function() {
        if ($(this).prop('checked')) {
            $('.header-sub-menu-checkbox').prop('checked', false);
            $(this).prop('checked', true);
        }
    })
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

/* This fetches all base game, which will be displayed in the grid */
async function fetchGames() {
    $.ajax({
        url: api_url + 'collection?username=' + bggUserName + '&stats=1&excludesubtype=boardgameexpansion',
        dataType: 'text'
    }).done(function(data, statusText, XHR) {
        if (XHR.status == 200) {
            boardGames = $.xml2json(data);
            populateGrid($.xml2json(data));
        } else {
            /*
            Sometimes BGG needs to rebuild their cache with a user collection
            This makes sure the collection is fetched without sending too many request to the BGG API 
            */
            const timeOut = setTimeout(fetchGames, 1000)
        }
    })
}

/* To be able to shown owned expansions, a separate GET needs to fetch a users expansions */
async function fetchAllExpansions() {
    $.ajax({
        url: api_url + 'collection?username=' + bggUserName + '&stats=1&subtype=boardgameexpansion',
        dataType: 'text'
    }).done(function(data, statusText, XHR) {
        if (XHR.status == 200) {
            expansions = $.xml2json(data);
        } else {
            /*
            Sometimes BGG needs to rebuild their cache with a user collection
            This makes sure the collection is fetched without sending too many request to the BGG API 
            */
            const timeOut = setTimeout(fetchAllExpansions, 1000)
        }
    })
}

/* Fetch all data on specific game */
async function fetchSpecificGame(boardGameId) {
    $.ajax({
        url: api_url + '/thing?id=' + boardGameId + '&stats=1',
        dataType: 'text'
    }).done(function(data, statusText, XHR) {
        if (XHR.status < 300) {
            populateModal($.xml2json(data));
        } else {
            const timeOut = setTimeout(fetchSpecificGame(boardGameId), 1000);
        }
    })
}

async function fetchLastPlayed(gameId) {
    try {
        const result = $.xml2json(await $.ajax({
            url: api_url + 'plays?username=' + bggUserName + '&stats=1&id=' + gameId,
            type: 'GET'
        }));
        
        if (result.play) {
            return result.play.date ? result.play.date : result.play[0].date;
        } else {
            return '-';
        }
    } catch(error) {
        console.error('Error from fetchLastPlayed: ', error);
        throw error;
    }
}

async function populateGrid(games) {
    /* Create a new game cell for each game in collection */
    console.log('Total games: ' + games.item.length);
    for (const game of games.item) {
        let lastPlayed;
        try {
            lastPlayed = await fetchLastPlayed(game.objectid);
        } catch {
            console.error('Error fetching last played:', error);

        }

        /* Handle single data (only 2 players, only 30 min playtimes) responses */
        const playerCount = game.stats.maxplayers == game.stats.minplayers ? game.stats.maxplayers : game.stats.minplayers + '-' + game.stats.maxplayers;
        const playTime = game.stats.minplaytime == game.stats.maxplaytime ? game.stats.minplaytime : game.stats.minplaytime + '-' + game.stats.maxplaytime;
        const userScore = game.stats.rating.value == "N/A" ? 0 : game.stats.rating.value;
        
        let gameCell = document.createElement('div');
        gameCell.className = 'game-cell';
        gameCell.id = game.objectid;
        gameCell.setAttribute('data-user-score' , userScore == "N/A" ? 0 : userScore);
        gameCell.setAttribute('data-last-played' , lastPlayed);
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

function toggleModal(id) {
    if ($('.gameModal-background').attr('data-visible') == 0)
        fetchSpecificGame(id);
    else {
        resetModal();
    }
}

function populateModal(game) {
    /* Votes is used for finding highest resulting poll */
    let votes = 0;
    let keywords = new Array();
    let keywordsCounter = 0;
    let mechanicsCounter = 0;
    game.item.link.forEach(boardLink => {
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
        }
    }); 

    /* Recommended player counts */
    let bestPlayerCount = 0;
    if (game.item.minplayers.value == game.item.maxplayers.value) {
        $('.gameModal-players .data').text(game.item.minplayers.value);
    } else {
        /* If not fixed player count, fetch recommended player count */
        game.item.poll.forEach(poll => {
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
        $('.gameModal-players .data').text(game.item.minplayers.value + '-' + game.item.maxplayers.value + ' (best at ' + bestPlayerCount + ')');
    }

    if (game.item.minplaytime.value == game.item.maxplaytime.value) {
        $('.gameModal-time .data').text(game.item.minplaytime.value + ' min');
    } else {
        $('.gameModal-time .data').text(game.item.minplaytime.value + '-' + game.item.maxplaytime.value + ' min (avg ' + game.item.playingtime.value + ' min)');
    }
    $('.gameModal-box a.bgg-link').attr({'href': 'https://boardgamegeek.com/boardgame/' + game.item.id , 'target': '_blank'});
    $('.gameModal-name').text(game.item.name.length > 1 ? game.item.name[0].value : game.item.name.value );
    $('.gameModal-description').text(decodeEntities(game.item.description));
    $('.gameModal-image').attr('src', game.item.image);
    $('.gameModal-weight .data').text((game.item.statistics.ratings.averageweight.value * 1).toFixed(2));
    $('.gameModal-score-player .data').text(document.getElementById(game.item.id).getAttribute('data-user-score'));
    $('.gameModal-score-bgg .data').text((game.item.statistics.ratings.average.value * 1).toFixed(2));
    $('.gameModal-last-played .data').text(document.getElementById(game.item.id).getAttribute('data-last-played'));
    $('.gameModal-keywords .data').text(keywords.join(', '));
    $('.gameModal-background').attr('data-visible' , 1).fadeIn('150ms');
}


function resetModal() {
    $('.gameModal-background').attr('data-visible' , 0);
    $('.gameModal-background').fadeOut('150ms');
    setTimeout(function() {
        $('.gameModal-name, .gameModal-description, .gameModal-box .data').text('');
        $('.gameModal-image').attr('src' , '');
    }, 300);
}

function decodeEntities(encodedString) {
    var textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
}