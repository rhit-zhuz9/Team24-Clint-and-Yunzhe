/**
 * @fileoverview
 * Provides the JavaScript interactions for all pages.
 *
 * @author 
 * Clint Zhu and Yunzhe Wei
 */

/** namespace. */
var rhit = rhit || {};

rhit.FB_COLLECTION_CULTFILMS = "CultFilms";
rhit.FB_KEY_TITLE = "title";
rhit.fbFilmsManger = null;


function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

rhit.ListPageController = class {
	constructor() {
		rhit.fbFilmsManger.beginListening(this.updateList.bind(this))
	}

	async updateList() {
		const newList = htmlToElement('<div id="moviesContainer" class="rows justify-content-center"></div>');
		for (let i = 0; i < rhit.fbFilmsManger.length; i++) {
			const movie = rhit.fbFilmsManger.getFilmAtIndex(i);
			const newCard = await this._createdCard(movie);
			newCard.onclick = (event) => {

				//window.location.href = `/singlePic.html?id=${pic.id}`;
			};
			newList.appendChild(newCard);
		}

		const oldList = document.querySelector("#moviesContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
	}

	async getUrl(title) {

		const response = await fetch(`//www.omdbapi.com/?apikey=5cb55cbf&t=${title}`);
		const data = await response.json();
		console.log('Response data:', data);
		if (data["Response"] == "True" && data["Poster"].length > 5) {
       		return data["Poster"];

		} else {
			console.log("Missing poster data.  Do nothing.");
		}
		return null;
	}

	async _createdCard(Movie) {

		const url = await this.getUrl(Movie.title);
		
		return htmlToElement(`<div class="pin col-3" id="${Movie.id}">
        <img src = "${url}" alt="${Movie.title}">
		<p class="name">${Movie.title}</p>
      </div>`);
	}
}

rhit.Movie = class {
	constructor(id, title) {
		this.id = id;
		this.title = title;
	}
}

rhit.FbFilmsManger = class {
	constructor() {
		console.log("created movie manager");
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_CULTFILMS);
		this._unsubscribe = null;
	}
	beginListening(changeListener) {
		this._unsubscribe = this._ref.limit(40).onSnapshot((querySnapshot) => {
			this._documentSnapshots = querySnapshot.docs;
			// querySnapshot.forEach((doc) => {
			// 	console.log(doc.data());\\\\
			// });
			changeListener();
		});
	}
	stopListening() {
		this._unsubscribe();
	}
	// update(id, quote, movie) {    }
	// delete(id) { }
	get length() {
		return this._documentSnapshots.length;
	}

	getFilmAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const movie = new rhit.Movie(
			docSnapshot.id,
			docSnapshot.get(rhit.FB_KEY_TITLE)
		);
		return movie;
	}
}

rhit.main = function () {
	console.log("Ready");
	if (document.querySelector('#listPage')) {
		console.log("You are on the list page.");
		rhit.fbFilmsManger = new rhit.FbFilmsManger();
		new rhit.ListPageController();
	}
};

rhit.main();
