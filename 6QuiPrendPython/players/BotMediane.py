from players.player import Player
from game.card import Card
from game.nimmtGame import NimmtGame    

class BotMediane(Player):
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
        # """
        # Permet d'obtenir la carte à jouer.

        # :return: La réponse du joueur.
        # """    
        # taille_main=len(self.hand)
        # if taille_main%2==0:
        #     return int(self.hand[(taille_main/2)-1].__repr__())
        # else:
        #     return int(self.hand[(taille_main//2)].__repr__())
        pass
        

    def player_turn(self, game):
        taille_main=len(self.hand)

        if taille_main%2==0:
            return self.hand[(taille_main/2)-1].value
        else:
            return self.hand[(taille_main//2)]
    