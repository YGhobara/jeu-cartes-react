import React from "react";
import './App.css';
import io from 'socket.io-client';
const socket = io('http://localhost:8000');

export function finSQP(){

    const [listeJoueurs, setListeJoueurs] = React.useState([]);

    socket.emit('RequestScoreSQP');
    socket.on('scoreboardSQP', listeJoueursTriee => {
        setListeJoueurs(listeJoueursTriee);
    });

    let scoreboardHTML = [];

    listeJoueurs.forEach((joueur, index) => {
        if (index == 0){
            scoreboardHTML.push(<tr key={index}><td><h2>Vainqueur:<b>{joueur.user}</b></h2></td><td>{joueur.points}</td></tr>)
        } else {
            scoreboardHTML.push(<tr key={index}><td>{joueur.user}</td><td>{joueur.points}</td></tr>);
        }
    });

    return (
        <div className="page-score">
          <h1>Scoreboard: </h1>
          <table className="scrollable-list">
            <tr key="X"><th>Nom</th><th>Points</th></tr>
            {scoreboardHTML}
          </table>
          
        </div>
    );
}


/*
function finJeu6QP(){
    io.emit('fin6QP');
}

function verifPoints(joueur){
    if (joueur.points >= 66){
        finJeu6QP();
    }
}

function trierJoueurs(ListeDesJoueurs){ // retourne la liste des joueurs triées croissants vis a vis de leur point
    let terminaison;
    do {
        terminaison = false;
        for(var i=0; i < ListeDesJoueurs.length-1; i++){
            if(ListeDesJoueurs[i].points > ListeDesJoueurs[i+1].points) {
                let tmp = ListeDesJoueurs[i];
                ListeDesJoueurs[i] = ListeDesJoueurs[i+1];
                ListeDesJoueurs[i+1] = tmp;
                terminaison = true;
            }
        }
    }	while	(terminaison);
}
*/