import React from "react";
import './App.css';
import io from 'socket.io-client'

const socket = io('http://localhost:8000');



function listeParties(){
    var listeParties = [];

    socket.on('listeParties', listeObjets => {
        listeObjets.forEach(partie => {
            listeParties.push(<tr><td>{partie.host}</td><td>{partie.joueurs.length}/{partie.maxJoueurs}</td></tr>);
        });
    })

    return (
        <div class="container" className="listParties">
            <table className="scrollable-list" >
                <tbody>
                    <tr>
                    <th>Host</th>
                    <th>Joueurs</th>
                    </tr>
                    {listeParties}
                </tbody>
            </table>
        </div>
      );

}