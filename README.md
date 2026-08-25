# Noble Deck
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-8C56D4)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
---
## Sistema de Gerenciamento de Loja de Card Games

O **Noble Deck** é um sistema de gerenciamento desenvolvido para uma loja especializada em Trading Card Games (TCG).

A proposta do projeto é centralizar as principais informações e processos da loja, facilitando o controle de produtos, estoque, clientes, pedidos e torneios.

A loja trabalha com diferentes card games, incluindo:

* Pokémon TCG
* Magic: The Gathering
* Yu-Gi-Oh!
* One Piece Card Game

Além da comercialização de cartas, boosters, decks e acessórios, a loja também realiza torneios relacionados aos jogos.

---

## Sobre o projeto

Atualmente, parte do controle das atividades da loja é realizado manualmente, utilizando planilhas e mensagens. Esse tipo de gerenciamento pode causar problemas como divergências no estoque, informações desatualizadas, erros em cadastros, dificuldades no acompanhamento de pedidos e desorganização na realização dos torneios.

O Noble Deck foi proposto para reunir essas informações em um único sistema, tornando o gerenciamento mais organizado e facilitando o acesso aos dados.

---

## Objetivo

O objetivo do sistema é auxiliar no gerenciamento das principais atividades da loja.

O Noble Deck deverá permitir o controle de:

* Usuários
* Produtos
* Estoque
* Pedidos
* Torneios

O acesso às funcionalidades será definido de acordo com o tipo de usuário.

---

## Usuários do sistema

O sistema possui três tipos principais de usuários.

### Cliente

O cliente poderá:

* Criar uma conta;
* Realizar login;
* Consultar produtos;
* Realizar pedidos;
* Consultar pedidos anteriores;
* Inscrever-se em torneios;
* Consultar resultados e classificações.

### Funcionário

O funcionário será responsável pelas atividades operacionais da loja.

Entre suas funcionalidades estão:

* Cadastrar e alterar produtos;
* Controlar o estoque;
* Consultar pedidos;
* Atualizar o status dos pedidos;
* Cadastrar torneios;
* Gerenciar participantes;
* Registrar resultados das partidas.

### Administrador

O administrador será responsável pelo gerenciamento geral do sistema.

Suas principais funções incluem:

* Gerenciar usuários;
* Gerenciar funcionários;
* Gerenciar produtos;
* Gerenciar estoque;
* Gerenciar torneios;
* Controlar o acesso às funcionalidades administrativas.

---

## Funcionalidades

### Gerenciamento de usuários

O sistema deverá permitir:

* Cadastro de clientes;
* Login de usuários;
* Alteração de dados cadastrais;
* Controle de acesso de acordo com o tipo de usuário;
* Gerenciamento de usuários pelo administrador.

### Produtos

Os funcionários poderão:

* Cadastrar produtos;
* Alterar informações;
* Consultar produtos;
* Pesquisar produtos;
* Alterar preços;
* Inativar produtos;
* Consultar a quantidade disponível em estoque.

Cada produto poderá possuir informações como nome, descrição, categoria, jogo, preço e quantidade disponível.

### Estoque

O sistema permitirá:

* Consultar o estoque;
* Registrar entradas de produtos;
* Registrar saídas de produtos;
* Atualizar a quantidade disponível;
* Identificar produtos com estoque abaixo do limite definido.

### Pedidos

Os clientes poderão:

* Criar pedidos;
* Adicionar produtos aos pedidos;
* Consultar o valor total;
* Acompanhar o status;
* Consultar pedidos realizados anteriormente.

Os funcionários poderão consultar os pedidos e atualizar seus respectivos status.

### Torneios

O sistema permitirá:

* Cadastrar torneios;
* Informar o jogo, data e horário;
* Definir o limite de participantes;
* Realizar inscrições;
* Consultar os participantes;
* Registrar resultados das partidas;
* Consultar a classificação final.

---

## Tecnologias

O projeto será dividido entre frontend e backend.

### Frontend

Para o desenvolvimento da interface serão utilizadas as seguintes tecnologias:

* TypeScript
* React

O frontend será responsável pelas telas e pela interação do usuário com o sistema.

### Backend

O backend será desenvolvido utilizando:

* Python

A responsabilidade do backend será concentrar as regras de negócio, processamento das informações e comunicação com o banco de dados.

### Comunicação entre frontend e backend

A integração entre o frontend e o backend provavelmente será realizada utilizando **FastAPI**.

A arquitetura inicial prevista é:

```text
Frontend
React + TypeScript
        │
        │
        ▼
API
FastAPI
        │
        │
        ▼
Backend
Python
        │
        │
        ▼
Banco de Dados
```

> O uso do FastAPI ainda poderá ser confirmado ou alterado durante o desenvolvimento do projeto.

---

## Principais entidades

Com base no levantamento inicial do sistema, foram identificadas as seguintes entidades:

```text
Usuário
├── Cliente
├── Funcionário
└── Administrador

Produto
Estoque

Pedido
└── ItemPedido

Torneio
├── Inscrição
└── Partida
```

---

## Requisitos não funcionais

Além das funcionalidades principais, o sistema também prevê recursos relacionados à personalização da interface, como:

* Customização estética de perfil;
* Temas visuais;
* Apelidos personalizados;
* Animações e transições;
* Exibição de emblemas decorativos.

---

## Status do projeto

O projeto está atualmente em fase de desenvolvimento.

Tecnologias:

| Área                  | Tecnologia               |
| --------------------- | ------------------------ |
| Frontend              | React                    |
| Linguagem do frontend | TypeScript               |
| Backend               | Python                   |
| API                   | FastAPI (Pensando sobre) |

---

## Desenvolvedores

Projeto acadêmico desenvolvido por alunos do curso de **Tecnologia em Análise e Desenvolvimento de Sistemas**.

* Henry Youji Oseki
* Pedro Henrique Nascimento
* Lucas Tadashi Azambuja Miasaki

---
