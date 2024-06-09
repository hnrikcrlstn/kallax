var totalCollection = {};
const api_url = 'https://boardgamegeek.com/xmlapi2/';
$(document).ready(function() {
    fetchGames();
    fetchAllGames();
})

function fetchGames() {
    $.ajax({
        url: api_url + 'collection?username=hcarl&stats=1&excludesubtype=boardgameexpansion',
        dataType: 'text',
    }).done(function(data, statusText, XHR) {
        if (XHR.status == 200) {
            populate($.xml2json(data));
        } else {
            const timeOut = setTimeout(fetchGames, 1000)
        }
    })
}

function fetchAllGames() {
    $.ajax({
        url: api_url + 'collection?username=hcarl&stats=1',
        dataType: 'text',
    }).done(function(data, statusText, XHR) {
        if (XHR.status == 200) {
            totalCollection = $.xml2json(data);
        } else {
            const timeOut = setTimeout(fetchAllGames, 1000)
        }
    })
}

function populate(boardgames) {
    
    boardgames.item.forEach(game => {
        console.log(game);

        let playerCount = game.stats.maxplayers == game.stats.minplayers ? game.stats.maxplayers : game.stats.minplayers + '-' + game.stats.maxplayers;
        let playTime = game.stats.minplaytime == game.stats.maxplaytime ? game.stats.minplaytime : game.stats.minplaytime + '-' + game.stats.maxplaytime;
        let gameCell = document.createElement('div');
        gameCell.className = 'game-cell';
        gameCell.id = game.objectid;
        gameCell.innerHTML = '<div class="game-name">' +
        '<h3>' + game.name + '</h3>' + 
        '</div>' +
        '<div class="game-cover">' +
        '<div class="game-bgg-score game-score" style="background-position: ' + game.stats.rating.average.value * 10 + '% bottom">' + parseFloat(game.stats.rating.average.value).toFixed(2) + '</div>' +
        '<div class="game-user-score game-score" style="background-position: ' + game.stats.rating.value * 10 + '% bottom">' + game.stats.rating.value + '</div>' +
        '<img src="' + game.image + '">' + 
        '</div>' +
        '<div class="game-data">' + 
        '<div class="game-data-row">' +
        '<div>' + playerCount + '</div>' +
        '<div>' + playTime + ' min</div>' +
        '</div>' +
        '<div class="game-data-row game-header-row">' +
        '<div>Players</div><div>Play time</div>' +
        '</div></div>'
        $('.game-grid').append(gameCell)
    });
}