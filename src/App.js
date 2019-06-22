/** @format */
import React from 'react';
import styled from 'styled-components';
import {Client} from 'boardgame.io/react';
import {Game, INVALID_MOVE} from 'boardgame.io/core';
import {AI} from 'boardgame.io/ai';

// Detect if these cells contain a winning state. This is called after each
// player makes their move, so we don't need to return the ID of the winner.
const isVictory = cells =>
  // horizontal victory
  (cells[0] !== null && (cells[0] === cells[1] && cells[0] === cells[2])) ||
  (cells[3] !== null && (cells[3] === cells[4] && cells[3] === cells[5])) ||
  (cells[6] !== null && (cells[6] === cells[7] && cells[6] === cells[8])) ||
  // vertical victory
  (cells[0] !== null && (cells[0] === cells[3] && cells[0] === cells[6])) ||
  (cells[1] !== null && (cells[1] === cells[4] && cells[1] === cells[7])) ||
  (cells[2] !== null && (cells[2] === cells[5] && cells[2] === cells[8])) ||
  // diagonal victory
  (cells[0] !== null && (cells[0] === cells[4] && cells[0] === cells[8])) ||
  (cells[2] !== null && (cells[2] === cells[4] && cells[2] === cells[6]));

// A complete board is one that has a mark in every cell.
const isComplete = cells => cells.filter(c => c === null).length === 0;
const allBoardsComplete = boards =>
  boards.filter(b => !b.complete).length === 0;

// Interpret the local games as a global game based on their winners.
const boardsToCells = boards => boards.map(b => b.winner);

const isValidMove = (G, boardId, cellId) =>
  (boardId === G.nextBoardId || G.nextBoardId === null) &&
  !G.boards[boardId].complete &&
  G.boards[boardId].cells[cellId] == null;

const UltimateTicTacToe = Game({
  setup: () => ({
    boards: Array(9)
      .fill(null)
      .map(() => ({
        cells: Array(9).fill(null),
        complete: false,
        winner: null,
      })),
    nextBoardId: null,
  }),

  moves: {
    markCell(G, ctx, boardId, cellId) {
      if (!isValidMove(G, boardId, cellId)) {
        return INVALID_MOVE;
      }

      G.boards[boardId].cells[cellId] = ctx.currentPlayer;

      if (isVictory(G.boards[boardId].cells)) {
        G.boards[boardId].complete = true;
        G.boards[boardId].winner = ctx.currentPlayer;
      } else if (isComplete(G.boards[boardId].cells)) {
        G.boards[boardId].complete = true;
      }

      G.nextBoardId = G.boards[cellId].complete ? null : cellId;

      ctx.events.endTurn();
    },
  },

  flow: {
    endGameIf: (G, ctx) => {
      const cells = boardsToCells(G.boards);
      if (isVictory(cells)) {
        return {winner: ctx.currentPlayer};
      }
      if (isComplete(cells) || allBoardsComplete(G.boards)) {
        return {draw: true};
      }
    },
  },
});

const GlobalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr auto;
  margin: 20px;
  grid-gap: 20px;
  width: min-content;
  height: min-content;
`;

const LocalBoardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 70px);
  grid-template-rows: repeat(3, 70px);
  opacity: ${props => (props.isComplete ? 0.2 : 1.0)};
`;

const Board = styled.div`
  border: 2px solid ${props => (props.isValidNext ? '#444' : '#ccc')};
  box-shadow: 3px 3px 10px hsla(0, 0%, 0%, 0.1);
  position: relative;
`;

const LocalBoardWinner = styled.div`
  font-size: 12rem;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Cell = styled.div`
  border: 1px solid #ddd;
  font-size: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => (props.isValidNext ? 'pointer' : 'default')};

  :hover {
    background: ${props =>
      props.isValidNext ? 'hsla(60, 100%, 50%, 0.2)' : 'inherit'};
  }
`;

const LocalBoard = ({isValidNext, isComplete, winner, cells, onClickCell}) => {
  return (
    <Board isValidNext={isValidNext}>
      <LocalBoardGrid isComplete={isComplete}>
        {cells.map((cell, cellId) => (
          <Cell
            key={cellId}
            isValidNext={isValidNext && cell === null}
            onClick={() => onClickCell(cellId)}>
            {'XO'[cell]}
          </Cell>
        ))}
      </LocalBoardGrid>
      {winner ? <LocalBoardWinner>{'XO'[winner]}</LocalBoardWinner> : null}
    </Board>
  );
};

const MessageBar = styled.div`
  border: 2px solid ${props => props.emphasized ? "#000" : "#eee"};
  text-align: center;
  font-size: 2rem;
  padding: 10px;
  grid-area: auto / span 3;
`;

const UltimateTicTacToeBoard = ({G, ctx, moves, events}) => {
  return (
    <div style={{width: 'min-content', userSelect: 'none'}}>
      <GlobalGrid>
        {G.boards.map((board, boardId) => (
          <LocalBoard
            key={boardId}
            isValidNext={
              ctx.gameover === undefined &&
              !board.complete &&
              (boardId === G.nextBoardId || G.nextBoardId === null)
            }
            isComplete={board.complete}
            winner={board.winner}
            onClickCell={cellId => moves.markCell(boardId, cellId)}
            cells={board.cells}
          />
        ))}
        <MessageBar emphasized={ctx.gameover !== undefined}>
          {ctx.gameover !== undefined
            ? ctx.gameover.draw
              ? 'Draw'
              : `${'XO'[ctx.gameover.winner]} wins`
            : `${'XO'[ctx.currentPlayer]}'s turn`}
        </MessageBar>
      </GlobalGrid>
    </div>
  );
};

const App = Client({
  game: UltimateTicTacToe,
  board: UltimateTicTacToeBoard,
  debug: false,
  ai: AI({
    enumerate: (G, ctx) => {
      let moves = [];
      for (let boardId = 0; boardId < 9; boardId++) {
        for (let cellId = 0; cellId < 9; cellId++) {
          if (isValidMove(G, boardId, cellId)) {
            moves.push({move: 'markCell', args: [boardId, cellId]});
          }
        }
      }
      return moves;
    },
  }),
});

export default App;
