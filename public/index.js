var app = angular.module("bullsAndCows", []);

app.controller("gameController", function ($q, $timeout, $http, $scope) {
    var socket;
    var maxNumberLength = 4;
    var scrollToBottomElementId = 'guesses';
    var room = getRoomName();
    var gameStarted = false;
    var isGameOver = false;
    var competitorIsActiveDeferred = $q.defer();

    $scope.yourNumber = '';
    $scope.competitorHasNumber = '';
    $scope.competitorIsConnected = false;
    $scope.guesses = {you: [], competitor: [],};

    $scope.gameStates = {
        occupied: {
            id: 'occupied',
            message: 'Sorry. This room is occupied.',
            keyboardIsActive: false,
            inputHandler: _.noop
        },
        enterNumber: {
            id: 'enterNumber',
            message: 'Enter your number...',
            keyboardIsActive: true,
            inputHandler: function (number) {
                $scope.yourNumber = applyNewChar($scope.yourNumber, number);
                if ($scope.yourNumber.length === maxNumberLength) {
                    emit('competitor-number', {});
                    if ($scope.competitorHasNumber) {
                        $scope.guesses.you.push({number: ''});
                        $scope.gameState = $scope.gameStates.yourTurn;
                    } else {
                        $scope.gameState = $scope.gameStates.competitorTurn;
                    }
                }
            }
        },
        yourTurn: {
            id: 'yourTurn',
            message: 'Enter your guess...',
            keyboardIsActive: true,
            inputHandler: yourTurnInputHandler
        },
        competitorTurn: {
            id: 'competitorTurn',
            message: 'Waiting for opponent...',
            keyboardIsActive: false,
            inputHandler: _.noop
        },
        youWin: {
            id: 'you-win',
            message: 'You win!',
            inputHandler: _.noop
        },
        competitorWinKeepGuess: {
            id: 'opponent-win',
            message: 'Opponent wins. You can keep guessing...',
            inputHandler: yourTurnInputHandler
        },
        competitorWin: {
            id: 'opponent-win',
            message: 'Game Over. Opponent wins.',
            inputHandler: _.noop
        },
    };
    $scope.gameState = $scope.gameStates.competitorTurn;

    function yourTurnInputHandler(number) {
        var guess = _.last($scope.guesses.you);
        guess.number = applyNewChar(guess.number, number);
        if (guess.number.length === maxNumberLength) {
            emit('competitor-guess', guess.number); // continue in socket event handler
        }
    }

    init();

    function init() {
        getActiveUsers(room).then(activeUsers => {
            if (activeUsers === 2) {
                $scope.gameState = $scope.gameStates.occupied;
                return;
            }
            $http
                .post('create-room', {room: room})
                .then(() => {
                    socket = io('/' + room);
                    initSocketEvents();
                    socket.on('connect', resetCompetitorStatus);
                });
        });

        function initSocketEvents() {
            socket.on('connected', resetCompetitorStatus);
            socket.on('disconnected', resetCompetitorStatus);
            socket.on('competitor-number', () => {
                $scope.competitorHasNumber = true;
                $scope.$apply();
            });
            socket.on('competitor-guess', (number) => {
                var guess = {
                    number: number,
                    completed: true,
                };
                guess.bulls = getBulls($scope.yourNumber, number);
                guess.cows = getCows($scope.yourNumber, number, guess.bulls);
                guess.socketId = socket.id;
                socket.emit('guess-checked', guess);
                $scope.$apply();

                function getBulls(origNumber, guessNumber) {
                    var count = 0;
                    _.times(maxNumberLength, idx => {
                        if (origNumber[idx] === guessNumber[idx]) count++;
                    });
                    return count;
                }

                function getCows(origNumber, guessNumber, bullsCount) {
                    var count = 0;
                    _.forEach(guessNumber, guessChar => {
                        if (origNumber.indexOf(guessChar) > -1) count++;
                    });
                    return count - bullsCount;
                }
            });
            socket.on('guess-checked', function (guess) {
                var isYourGuess = guess.socketId !== socket.id; // your guess if competitor was checking
                var isAllBulls = guess.bulls === maxNumberLength;
                if (isYourGuess) {
                    $scope.guesses.you.pop(); // replace current with checked one
                    $scope.guesses.you.push(guess);
                } else {
                    $scope.guesses.competitor.push(guess);
                }

                if (isYourGuess && !isGameOver && !isAllBulls) { // your turn (miss)
                    $scope.gameState = $scope.gameStates.competitorTurn;
                }
                if (!isYourGuess && !isGameOver && !isAllBulls) { // competitor turn (miss)
                    $scope.gameState = $scope.gameStates.yourTurn;
                    $scope.guesses.you.push({number: ''}); // start new guess
                }
                if (isYourGuess && isGameOver && !isAllBulls) { // your turn when game over (miss)
                    // keep guessing
                    $scope.guesses.you.push({number: ''}); // start new guess
                }
                if (!isYourGuess && isGameOver && !isAllBulls) { // competitor turn when game over (miss)
                    // you already won
                }
                if (isYourGuess && isGameOver && isAllBulls) { // your turn when game over (hit)
                    $scope.gameState = $scope.gameStates.competitorWin;
                }
                if (!isYourGuess && isGameOver && isAllBulls) { // competitor turn when game over (hit)
                    // you already won
                }
                if (isYourGuess && !isGameOver && isAllBulls) { // your turn (hit)
                    isGameOver = true;
                    $scope.gameState = $scope.gameStates.youWin;
                }
                if (!isYourGuess && !isGameOver && isAllBulls) { // competitor turn (hit)
                    isGameOver = true;
                    $scope.gameState = $scope.gameStates.competitorWinKeepGuess;
                    $scope.guesses.you.push({number: ''}); // start new guess
                }

                $scope.$apply();
                $timeout(updateScroll);
            });
        }
    }

    function emit(eventName, params) {
        competitorIsActiveDeferred.promise.then(() => {
            socket.emit(eventName, params);
        });
    }

    function getRoomName() {
        var queryParams = _.fromPairs(_.map(window.location.search.substr(1).split('&'), x => x.split('=')));
        return queryParams.room || Math.random().toString(36).substring(2, 15);
    }

    function resetCompetitorStatus() {
        getActiveUsers(room).then(activeUsers => {
            $scope.competitorIsConnected = activeUsers > 1;
            if ($scope.competitorIsConnected && !gameStarted) {
                $scope.gameState = $scope.gameStates.enterNumber;
            }
            if ($scope.competitorIsConnected) {
                competitorIsActiveDeferred.resolve();
            } else {
                competitorIsActiveDeferred = $q.defer();
            }
        });
    }

    function getActiveUsers(room) {
        return $http.get('users?room=' + room).then(response => {
            return response.data.active;
        });
    }

    $scope.selectNumber = function (number) {
        if (!$scope.gameState.inputHandler) return;
        $scope.gameState.inputHandler(number);
    };

    $scope.toggleVisibility = function (event) {
        event.target.style.opacity = !parseInt(event.target.style.opacity || 1) ? 1 : 0;
    };

    function updateScroll() {
        var element = document.getElementById(scrollToBottomElementId);
        element.scrollTop = element.scrollHeight;
    }

    function applyNewChar(number, newChar) {
        if (number.length === maxNumberLength) return number; // do not allow bigger numbers
        if (number.indexOf(newChar) > -1) return number; // do not allow same chart
        if (newChar > -1) {
            return number + newChar;
        } else {
            // -1 means delete
            if (!number) return number;
            return number.substr(0, number.length - 1);
        }
    }

});