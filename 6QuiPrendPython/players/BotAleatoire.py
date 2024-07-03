from players.player import Player
from game.card import Card
from game.nimmtGame import NimmtGame
import random

class BotAleatoire(Player):
    def info(self, message):
        """
        Affiche un message à l'attention du joueur.
        
        :param message: Le message à afficher.
        """

    def getLineToRemove(self, game):
        min = NimmtGame.total_cows(game.table[0])
        ligne_index = 0

        for i in range(1, 3):
            p = NimmtGame.total_cows(game.table[i])
            if p < min:
                min = p
                ligne_index = i
            
        return ligne_index + 1


    def getCardToPlay(self):    
        index = random.randint(0, len(self.hand)-1)
        response = self.hand[index].value
        return response
    

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
    