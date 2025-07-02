// --- DOM elements ---
const randomBtn = document.getElementById("random-btn");
const remixBtn = document.getElementById("remix-btn");
const remixThemeSelect = document.getElementById("remix-theme");
const recipeDisplay = document.getElementById("recipe-display");
const remixOutput = document.getElementById("remix-output");
const savedRecipesList = document.getElementById("saved-recipes-list");
const savedRecipesContainer = document.getElementById("saved-recipes-container");

let currentRecipeData = null;

// --- Helpers ---

function getIngredientsHtml(recipe) {
  let html = "";
  for (let i = 1; i <= 20; i++) {
    const ing = recipe[`strIngredient${i}`];
    const meas = recipe[`strMeasure${i}`];
    if (ing && ing.trim()) html += `<li>${meas ? `${meas} ` : ""}${ing}</li>`;
  }
  return html;
}

function renderRecipe(recipe, showSaveBtn = true) {
  recipeDisplay.innerHTML = `
    <div class="recipe-title-row">
      <h2>${recipe.strMeal}</h2>
    </div>
    <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
    <h3>Ingredients:</h3>
    <ul>${getIngredientsHtml(recipe)}</ul>
    <h3>Instructions:</h3>
    <p>${recipe.strInstructions.replace(/\r?\n/g, "<br>")}</p>
    ${showSaveBtn ? `<button id="save-recipe-btn" class="accent-btn save-inline-btn">Save Recipe</button>` : ""}
  `;
  if (showSaveBtn) {
    const saveBtn = document.getElementById("save-recipe-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
        if (!saved.includes(recipe.strMeal)) {
          saved.push(recipe.strMeal);
          localStorage.setItem("savedRecipes", JSON.stringify(saved));
          showSavedRecipes();
        }
      });
    }
  }
}

// --- Core Functions ---

async function fetchAndDisplayRandomRecipe() {
  recipeDisplay.innerHTML = "<p>Loading...</p>";
  remixOutput.textContent = "";
  try {
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
    const data = await res.json();
    currentRecipeData = data;
    const recipe = data.meals[0];
    renderRecipe(recipe, true);
  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load a recipe.</p>";
  }
}

function showSavedRecipes() {
  let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
  savedRecipesContainer.style.display = saved.length === 0 ? "none" : "";
  savedRecipesList.innerHTML = "";
  saved.forEach((name, idx) => {
    // Use template literals to create the list item and set innerHTML directly on the parent
    savedRecipesList.innerHTML += `
      <li class="saved-recipe-item">
        <span style="cursor:pointer;" title="Click to view this recipe">${name}</span>
        <button class="delete-btn">Delete</button>
      </li>
    `;
  });

  // Add event listeners after rendering all items
  Array.from(savedRecipesList.children).forEach((li, idx) => {
    const span = li.querySelector("span");
    span.addEventListener("click", async () => {
      recipeDisplay.innerHTML = "<p>Loading...</p>";
      remixOutput.textContent = "";
      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(saved[idx])}`);
        const data = await res.json();
        if (!data.meals || data.meals.length === 0) {
          recipeDisplay.innerHTML = "<p>Recipe not found.</p>";
          return;
        }
        currentRecipeData = data;
        renderRecipe(data.meals[0], true);
      } catch (error) {
        recipeDisplay.innerHTML = "<p>Sorry, couldn't load this recipe.</p>";
      }
    });

    const delBtn = li.querySelector(".delete-btn");
    delBtn.addEventListener("click", () => {
      let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
      saved.splice(idx, 1);
      localStorage.setItem("savedRecipes", JSON.stringify(saved));
      showSavedRecipes();
    });
  });
}

async function remixRecipe() {
  remixOutput.textContent = "Remixing...";
  const remixTheme = remixThemeSelect.value;
  const prompt = `
    Here is a recipe response from TheMealDB API:
    ${JSON.stringify(currentRecipeData)}
    Remix the first recipe in the data for this theme: "${remixTheme}"
    Give clear, step-by-step instructions and mention any changed ingredients. Make it very short, creative, fun, and actually possible.
  `;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "You are a helpful, creative recipe developer. You understand TheMealDB API JSON." },
          { role: "user", content: prompt }
        ]
      })
    });
    const data = await response.json();
    remixOutput.textContent = data.choices[0].message.content;
  } catch (error) {
    remixOutput.textContent = "Sorry, something went wrong remixing the recipe.";
  }
}

// --- Event bindings ---
randomBtn.addEventListener("click", fetchAndDisplayRandomRecipe);
remixBtn.addEventListener("click", remixRecipe);

document.addEventListener("DOMContentLoaded", () => {
  fetchAndDisplayRandomRecipe();
  showSavedRecipes();
});
