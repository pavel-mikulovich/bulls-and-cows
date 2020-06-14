var app = angular.module("bullsAndCows");
app.component("bcMenu", {
    templateUrl: '/menu/menu.html',
    bindings: {
        room: '=',
        name: '=',
        difficulty: '=',
        onChangeRoom: '&',
        onChangeName: '&',
        onChangeDifficulty: '&',
        onResetGame: '&',
    },
    controllerAs: 'ctrl',
    controller: function () {
        var ctrl = this;
        ctrl.modes = {
            button: {},
            screen: {}
        };
        ctrl.mode = ctrl.modes.button;
        ctrl.model = {
            name: null,
            room: null,
            difficulty: null
        };

        ctrl.$onInit = function () {
            ctrl.model.difficulty = ctrl.difficulty;
            ctrl.model.name = ctrl.name;
            ctrl.model.room = ctrl.room;
        };

        ctrl.showMenu = function () {
            ctrl.mode = ctrl.modes.screen;
        };

        ctrl.closeMenu = function () {
            ctrl.mode = ctrl.modes.button;
        };

        ctrl.changeRoom = function () {
            ctrl.onChangeRoom(ctrl.model.room);
        };

        ctrl.copyLink = function () {

        };

        ctrl.changeName = function () {
            ctrl.onChangeName(ctrl.model.name);
        };

        ctrl.changeDifficulty = function () {
            ctrl.onChangeDifficulty(ctrl.model.difficulty);
        };

        ctrl.resetGame = function () {
            ctrl.onResetGame();
        };
    }
});