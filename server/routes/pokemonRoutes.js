"use strict";

const bunyan = require('bunyan');
const pogobuf = require('pogobuf');

const props = require('../config/properties.js');
const expressUtils = require('../utils/expressUtils.js');

const Pokemon = require('../models/Pokemon.js');

const log = bunyan.createLogger({
	name: props.log.names.pokemonRoutes,
	streams: [{
		level: props.log.levels.console,
		stream: process.stdout
	}]
});

module.exports = {
	createRoutes: (app) => {
		app.post(props.routes.root + props.routes.pokemon, (req, res, next) => {
			const endpoint = props.routes.root + props.routes.pokemon;
			log.debug(
				{username: req.body.username}, 
				'POST request to ' + endpoint);

			if(!req.body.hasOwnProperty('username')){
				expressUtils.sendResponse(res, next, 400, {error: props.errors.username}, req.body.username, endpoint);
			} else if (!req.body.hasOwnProperty('password')) { 
				expressUtils.sendResponse(res, next, 400, {error: props.errors.password}, req.body.username, endpoint);
			} else if (!req.body.hasOwnProperty('type')) { 
				expressUtils.sendResponse(res, next, 400, {error: props.errors.type}, req.body.username, endpoint);
			} else {
				const client = new pogobuf.Client();

				let login = null;

				if(req.body.type.toLowerCase() === 'google'){
					login = new pogobuf.GoogleLogin();
				} else {
					login = new pogobuf.PTCLogin();
				}

				login.login(req.body.username, req.body.password).then(token => {
					client.setAuthInfo(req.body.type.toLowerCase(), token);

					client.init().then(() => {
						client.getInventory(0).then(inventory => {
							if (!inventory.success){
								expressUtils.sendResponse(res, next, 500, {error: props.errors.inventory}, req.body.username, endpoint);
							}

							let splitInventory = pogobuf.Utils.splitInventory(inventory)

							let rawCandies = splitInventory.candies;

							let rawPokemon = splitInventory.pokemon;
							let formattedPokemon = [];

							for(let i = 0; i < rawPokemon.length; i++){
								let pokemon = rawPokemon[i];

								if(pokemon.hasOwnProperty('is_egg') && !pokemon.is_egg){
									let candy = 0;
									for(let j = 0; j < rawCandies.length; j++){
										let rawCandy = rawCandies[j];

										if(rawCandy.family_id.toString() === props.pokemonFamilyIdByPokedexNum[pokemon.pokemon_id]){
											candy = rawCandy.candy;
										}
									}

									let name = props.pokemonNamesByDexNum[pokemon.pokemon_id.toString()];
									if(pokemon.hasOwnProperty('nickname') && pokemon.nickname.length > 0){
										name = pokemon.nickname;
									}

									formattedPokemon.push(new Pokemon(
										pokemon.pokemon_id,
										name, 
										props.pokemonNamesByDexNum[pokemon.pokemon_id.toString()],
										pokemon.individual_attack,
										pokemon.individual_defense,
										pokemon.individual_stamina,
										pokemon.stamina_max,
										parseFloat(((pokemon.individual_attack + pokemon.individual_defense + pokemon.individual_stamina) / 45 * 100).toFixed(2)),
										pokemon.cp,
										pokemon.favorite === 1 ? true : false,
										candy,
										props.pokemonNamesByDexNum[props.pokemonFamilyIdByPokedexNum[pokemon.pokemon_id]],
										pokemon.id
									));
								}
							}

							expressUtils.sendResponse(res, next, 200, {pokemon: formattedPokemon}, req.body.username, endpoint);
						}, err => {
							log.error({err: err.message});
							expressUtils.sendResponse(res, next, 500, {error: props.errors.inventory}, req.body.username, endpoint)
						});
					});
				}, err => {
					log.error({err: err.message});
					expressUtils.sendResponse(res, next, 500, {error: props.errors.login}, req.body.username, endpoint);
				});
			}
		});

		app.post(props.routes.root + props.routes.transfer, (req, res, next) => {
			const endpoint = props.routes.root + props.routes.transfer;
			log.debug(
				{username: req.body.username}, 
				'POST request to ' + endpoint);

			if(!req.body.hasOwnProperty('username')){
				expressUtils.sendResponse(res, next, 400, {error: props.errors.username}, req.body.username, endpoint);
			} else if (!req.body.hasOwnProperty('password')) { 
				expressUtils.sendResponse(res, next, 400, {error: props.errors.password}, req.body.username, endpoint);
			} else if (!req.body.hasOwnProperty('type')) { 
				expressUtils.sendResponse(res, next, 400, {error: props.errors.type}, req.body.username, endpoint);
			} else if (!req.body.hasOwnProperty('pokemon_id')) {
				expressUtils.sendResponse(res, next, 400, {error: props.errors.pokemon_id}, req.body.username, endpoint);
			} else if (!req.body.pokemon_id.hasOwnProperty('high')){
				expressUtils.sendResponse(res, next, 400, {error: props.errors.invalid_pokemon_id}, req.body.username, endpoint);
			} else if (!req.body.pokemon_id.hasOwnProperty('low')){
				expressUtils.sendResponse(res, next, 400, {error: props.errors.invalid_pokemon_id}, req.body.username, endpoint);
			} else if (!req.body.pokemon_id.hasOwnProperty('unsigned')){
				expressUtils.sendResponse(res, next, 400, {error: props.errors.invalid_pokemon_id}, req.body.username, endpoint);
			} 
			else {
				req.body.pokemon_id.high = Number(req.body.pokemon_id.high);
				req.body.pokemon_id.low = Number(req.body.pokemon_id.low);
				req.body.pokemon_id.unsigned = req.body.pokemon_id === "true" ? true : false;

				const client = new pogobuf.Client();

				let login = null;

				if(req.body.type.toLowerCase() === 'google'){
					login = new pogobuf.GoogleLogin();
				} else {
					login = new pogobuf.PTCLogin();
				}

				login.login(req.body.username, req.body.password).then(token => {
					client.setAuthInfo(req.body.type.toLowerCase(), token);

					client.init().then(() => {
						client.releasePokemon(req.body.pokemon_id).then(releaseResponse => {
							expressUtils.sendResponse(res, next, 200, {success: releaseResponse.result === 1 ? true : false}, req.body.username, endpoint);
						}, err => {
							log.error({err: err.message});
							expressUtils.sendResponse(res, next, 500, {error: props.errors.transfer}, req.body.username, endpoint);
						});
					});
				}, err => {
					log.error({err: err.message});
					expressUtils.sendResponse(res, next, 500, {error: props.errors.login}, req.body.username, endpoint);
				});
			}
		});
	}
}