from players.player import Player
from game.card import Card
from game.nimmtGame import NimmtGame 


class BotSmart(Player):
    def info(self, message):
        print("@"+ self.name+" : ",message)

    def getLineToRemove(self, game):
        min=NimmtGame.total_cows(game.table[0])
        ligneMin=0
        for line in range(1,len(game.table)):
            if NimmtGame.total_cows(game.table[line])<min:
                min=NimmtGame.total_cows(game.table[line])
                ligneMin=line

        return ligneMin+1

    def get_playable_cards(self, game):
        """
        Récupère toutes les cartes qui peuvent être jouées en ordre croissant.

        :return: tableau de toutes les cartes jouables.
        """
        # Récuperer dernière carte de chaque ligne
        last_cards = [line[-1] for line in game.table]

        # Ajoute les cartes jouables
        playable_cards = [card for card in self.hand if any(card > last_card for last_card in last_cards)]

        return sorted(playable_cards)

    def getCardToPlay(self, game):
        response = self.hand[0].value
        for i in range(1,len(self.hand)-1):
            if self.hand[i].value<response:
                response = self.hand[i].value
        return response
    
    def get_possible_moves(self, game):
        
        playable_cards = self.get_playable_cards(game)

        if len(playable_cards)>0:
            return playable_cards
        else:
            return self.hand
    
    def player_turn(self, game):
        self.info(game.display_scores())
        self.info(game.display_table())
        while True:
            self.info(f"Votre main : {' '.join(map(str, self.hand))}")
            try:
                playable_cards = self.get_playable_cards(game)
                if len(playable_cards) > 0:
                    return playable_cards[0]
    
                carteChoisie = Card(self.getCardToPlay(game))
                if carteChoisie in self.hand:
                    return carteChoisie
                else:
                    self.info("Vous n'avez pas cette carte dans votre main")
            except ValueError:
                self.info("Veuillez entrer un nombre entier correspondant à une carte dans votre main.")
   