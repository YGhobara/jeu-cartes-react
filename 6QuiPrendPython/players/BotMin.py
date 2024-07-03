from players.player import Player
from game.card import Card
from game.nimmtGame import NimmtGame    

class BotMin(Player):
    def info(self, message):
        """
        Affiche un message à l'attention du joueur.
        
        :param message: Le message à afficher.
        """

    def getLineToRemove(self, game):
        """
        permet d'obtenir la ligne à enlever quand la carte jouée était plus petite

        :param game: le jeu en cours
        :return: la ligne à enlever
        """
        min=NimmtGame.total_cows(game.table[0])
        ligneMin=0
        for line in range(1,len(game.table)):
            if NimmtGame.total_cows(game.table[line])<min:
                min=NimmtGame.total_cows(game.table[line])
                ligneMin=line

        return ligneMin+1
        

        
    def getCardToPlay(self):    
        """
        Permet d'obtenir la carte à jouer.

        :return: La réponse du joueur.
        """    
        response = self.hand[0].value
        for i in range(1,len(self.hand)-1):
            if self.hand[i].value<response:
                response = self.hand[i].value
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
    