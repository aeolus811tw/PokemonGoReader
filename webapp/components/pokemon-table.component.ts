import { Component, OnDestroy } from '@angular/core';

import { PokemonService } from '../services/pokemon.service'
import { PropertiesService } from '../services/properties.service'

import { Pokemon } from '../models/pokemon.model'
import { SortType } from '../models/sort-type.model'
import { PokemonTableStat } from '../models/pokemon-table-stat.model'

@Component({
	selector: 'pokemon-table',
	templateUrl: './webapp/templates/pokemon-table.component.html',
	styleUrls: ['./webapp/styles/pokemon-table.component.css']
})

export class PokemonTableComponent {
	private _pokemon: Pokemon[] = [];
	private _pokemonTableStats: PokemonTableStat[] = this._properties.pokemonTableStats;
	private _showTransferColumn: boolean = this._properties.showTransferColumn;
	//right now we're only allowing 1 transfer at a time, like God intended,
	//this may need to be updated later to allow for batch transfers
	private _transferringPokemonAtIndex: number = null;
	private _currentSortOrderName: string = '';

	constructor(private _properties: PropertiesService, private _pokemonService: PokemonService) { 
	}

	public set pokemon(pokemon: Pokemon[]){
		this._pokemon = pokemon;
		if(this._currentSortOrderName === ''){
			this._sortPokemon(this._properties.defaultPokemonTableSortOrder, false);
		} else {
			this._sortPokemon(this._currentSortOrderName, false);
		}
	}

	private _typeof(property: any): string{
		return typeof property;
	}

	private _getTransferButtonText(index: number): string{
		if(this._transferringPokemonAtIndex && this._transferringPokemonAtIndex === index){
			return 'Transferring...';
		}

		return 'Transfer';
	}

	private _sortPokemon(sortOrderName: string, reverseSortOrder: boolean) {
		if(this._properties.pokemonTableSortOrders.hasOwnProperty(sortOrderName)){
			let sortOrder = this._properties.pokemonTableSortOrders[sortOrderName];

			//double clicking a heading should reverse the primary sort
			if(this._currentSortOrderName === sortOrderName && reverseSortOrder){
				sortOrder[0].asc = !sortOrder[0].asc;
			}

			this._currentSortOrderName = sortOrderName;

			this._pokemon = this._pokemon.sort((a, b) => {
				for(let i: number = 0; i < sortOrder.length; i++){
					if(a[sortOrder[i].property] < b[sortOrder[i].property]) return sortOrder[i].asc ? -1 : 1;
					if(a[sortOrder[i].property] > b[sortOrder[i].property]) return sortOrder[i].asc ? 1 : -1;	
				}
				return 0;
			});
		}
	}

	private _transferPokemon(pokemon: Pokemon, index: number){
		this._transferringPokemonAtIndex = index;

		this._pokemonService.transferPokemon(pokemon).then(() => {
			this._transferringPokemonAtIndex = null;
			this._pokemonService.retrievePokemon();
		});
	}
}