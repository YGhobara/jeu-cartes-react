from players.player import Player
from game.card import Card
from game.nimmtGame import NimmtGame
import copy 


class BotMinMax(Player):
    TREE_DEPTH = 3
    def info(self, message):
        print("@"+ self.name+" : ",message)

    def evaluate_game_state(self):
        """
        Evalue l'état du jeu 
        
        :return: un score selon l'état du jeu 
        """
        # Un score plus élevé désigne un état du jeu favorable
        # favorable c'est-à-dire un total de boeufs bas et plus de cartes dans sa main
        return -self.score - len(self.hand)

    def getLineToRemove(self, game):
        min=NimmtGame.total_cows(game.table[0])
        ligneMin=0
        for line in range(1,len(game.table)):
            if NimmtGame.total_cows(game.table[line])<min:
                min=NimmtGame.total_cows(game.table[line])
                ligneMin=line

        return ligneMin+1

    def getCardToPlay(self, game):
        cardScores = []
        for card in self.hand:
            score = min_max(self, game, 3, card)
            cardScores.append((card, score))
        best_card, best_score = max(cardScores, key=lambda x: x[1])
        return best_card
    
    def player_turn(self, game):
        """
        Gère le tour de jeu d'un joueur.

        :param game : le jeu en cours
        """
        self.info(game.display_scores())
        self.info(game.display_table())
        while True:
            self.info(f"Votre main : {' '.join(map(str, self.hand))}")
            try:
                carteChoisie = Card(self.getCardToPlay())
                if carteChoisie in self.hand:
                    return carteChoisie
                else:
                    self.info("Vous n'avez pas cette carte dans votre main")
            except ValueError:
                self.info("Veuillez entrer un nombre entier correspondant à une carte dans votre main.")
                

    def min_max(self, game, depth, card_played):

        card_list = list(map(lambda c:Card(c),list(range(1, 105))))
        
        for player in copy_game.players:
                if player != self:
                    adversary = player

        possibleCards = []
        for card in card_list:
            if (card not in copy_game.alreadyPlayedCards) and (card not in self.hand):
                possibleCards.append(e)
            
        random_index = randint(0, len(possibleCards)-1)
        plays = [(self, card_played), (adversary, possibleCards[random_index])]
        game.update_table(plays)
        evaluation = evaluate_game_state(game)
        next_card = self.hand.pop()

        if depth < 1 or game.is_over:
            return evaluation

        else:
            copy_game = copy.deepcopy(game)
            possibleCards = []
            for card in card_list:
                if (card not in copy_game.alreadyPlayedCards) and (card not in self.hand):
                    possibleCards.append(e)
            plays = [(self, next_card), (adversary, possibleCards[random_index])]
            copy_game.update_table(plays)
            min_max(self, copy_game, depth-1)