const expectedYears = 70

function listenDate(expectedYears) {
	// const birthDate = new Date(2000, 1, 24) // месяц начинается с 0
	const birthDate = new Date(document.querySelector('input[type="date"]').value)

	addStats(expectedYears, birthDate)
}

function addStats(expectedYears, birthDate) {
	const weeksInYear = 52
	const today = new Date()

	const startYearWeeks = ((birthDate - new Date(birthDate.getYear()+1900, 0, 1)) / 1000 / 60 / 60 / 24 / 7)
	// console.log(startYearWeeks)

	const age = (today - birthDate) / 1000 / 60 / 60 / 24 / 365.25
	// console.log(age)

	const container = document.querySelector('.container')

	// Задаем кол-во столбцов и строк
	container.style.setProperty('--weeksInYear', weeksInYear)
	container.style.setProperty('--expectedYears', expectedYears)

	container.innerHTML = ''

	for (let i = 0; i < 52*70 - startYearWeeks; i++) {

		// Создаем новый элемент div
		let SquareDiv = document.createElement("div")

		// const digit = document.createTextNode(i) // создаем текст 
		// SquareDiv.appendChild(digit) // добавляем текст в наш элемент div

		if (i < startYearWeeks) {
			SquareDiv.classList.add('display-none')
		}

		if (i < (age * weeksInYear + startYearWeeks)) {
			SquareDiv.classList.add('filled')
	  	}

		SquareDiv.classList.add('classtest')

		container.appendChild(SquareDiv)
	}
}



addStats(expectedYears, new Date(9999, 0, 1))

const button = document.querySelector('input')
button.addEventListener('change', () => listenDate(expectedYears))