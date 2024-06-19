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
            populateGrid($.xml2json(data));
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

function populateGrid(boardgames) {
    boardgames.item.forEach(game => {
        let playerCount = game.stats.maxplayers == game.stats.minplayers ? game.stats.maxplayers : game.stats.minplayers + '-' + game.stats.maxplayers;
        let playTime = game.stats.minplaytime == game.stats.maxplaytime ? game.stats.minplaytime : game.stats.minplaytime + '-' + game.stats.maxplaytime;
        let userScore = game.stats.rating.value == "N/A" ? 0 : game.stats.rating.value;
        
        let gameCell = document.createElement('div');
        gameCell.className = 'game-cell';
        gameCell.id = game.objectid;
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
        '<div class="game-cover-image" style="background-image: url(' + "'" + game.image + "'" + ')">' + 
        '</div></div>' +
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
    
    $('.game-cell').on('click', function() {
        toggleModal($(this).attr('id'));
    });
    $('.gameModal-background, .gameModal-close').on('click', function(e) {
        if (e.target == this) {
            console.log('beep');
            resetModal();
        }
    });

    populateModal('1'); /* for test */
}

function toggleModal(id) {
    if ($('.gameModal-background').attr('data-visible') == 0)
        populateModal(id);
    else {
        resetModal();
    }
}

function populateModal(id) {
    $('.gameModal-background').attr('data-visible' , 1).fadeIn('150ms');

    /* Static test data */
    $('.gameModal-name').text('7 Wonders Duel')
    $('.gameModal-description').text("In many ways 7 Wonders Duel resembles its parent game 7 Wonders. Over three ages, players acquire cards that provide resources or advance their military or scientific development in order to develop a civilization and complete wonders. What's different about 7 Wonders Duel is that, as the title suggests, the game is solely for two players.&amp;#10;&amp;#10;Players do not draft cards simultaneously from decks of cards, but from a display of face-down and face-up cards arranged at the start of a round. A player can take a card only if it's not covered by any others, so timing comes into play, as it can with bonus moves that allow the player to take a second card immediately. As in the original game, each acquired card can be built, discarded for coins, or used to construct a wonder. Each player also starts with four wonder cards, and the construction of a wonder provides its owner with a special ability. Only seven wonders can be built, though, so one player will end up short.&amp;#10;&amp;#10;Players can purchase resources at any time from the bank, or they can gain cards during the game that provide them with resources for future building; as they are acquired, the cost for those resources increases for the opponent, representing the owner's dominance in this area.&amp;#10;&amp;#10;You can win 7 Wonders Duel in one of three ways: each time you acquire a military card, you advance the military marker toward your opponent's capital (also giving you a bonus at certain positions). If you reach the opponent's capital, you win the game immediately. Or if you acquire six of seven different scientific symbols, you achieve scientific dominance and win immediately. If none of these situations occurs, then the player with the most points at the end of the game wins")
    $('.gameModal-image').attr('src', 'https://cf.geekdo-images.com/zdagMskTF7wJBPjX74XsRw__original/img/Ju836WNSaW7Mab9Vjq2TJ_FqhWQ=/0x0/filters:format(jpeg)/pic2576399.jpg');
    $('.gameModal-players .data').text("2");
    $('.gameModal-weight .data').text("2.2");
    $('.gameModal-time .data').text("30 min");
    $('.gameModal-score-bgg .data').text('8.1');
    $('.gameModal-score-player .data').text('7.75');
    $('.gameModal-last-played .data').text('2024-06-17');
    $('.gameModal-keywords .data').text('End Game Bonuses, Income, Layering, Market, Modular board');
}

function resetModal() {
    $('.gameModal-background').attr('data-visible' , 0);
    $('.gameModal-background').fadeOut('150ms');
}