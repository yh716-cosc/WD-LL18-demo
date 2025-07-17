// --- DOM elements ---
const randomBtn = document.getElementById("random-btn");
const recipeDisplay = document.getElementById("recipe-display");
const remixBtn = document.getElementById("remix-btn"); // The Remix button
const remixThemeInput = document.getElementById("remix-theme"); // The remix theme input (dropdown or text)
let currentRecipe = null; // Store the current recipe for remixing

// This function creates a list of ingredients for the recipe from the API data
// It loops through the ingredients and measures, up to 20, and returns an HTML string
// that can be used to display them in a list format
// If an ingredient is empty or just whitespace, it skips that item 
function getIngredientsHtml(recipe) {
  let html = "";
  for (let i = 1; i <= 20; i++) {
    const ing = recipe[`strIngredient${i}`];
    const meas = recipe[`strMeasure${i}`];
    if (ing && ing.trim()) html += `<li>${meas ? `${meas} ` : ""}${ing}</li>`;
  }
  return html;
}

// This function displays the recipe on the page
function renderRecipe(recipe) {
  recipeDisplay.innerHTML = `
    <div class="recipe-title-row">
      <h2>${recipe.strMeal}</h2>
    </div>
    <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
    <h3>Ingredients:</h3>
    <ul>${getIngredientsHtml(recipe)}</ul>
    <h3>Instructions:</h3>
    <p>${recipe.strInstructions.replace(/\r?\n/g, "<br>")}</p>
    <button id="save-recipe-btn" class="accent-btn">Save Recipe</button>
  `;

  // Add event listener for Save button
  const saveBtn = document.getElementById("save-recipe-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveCurrentRecipe);
  }
}

// This function gets a random recipe from the API and shows it
async function fetchAndDisplayRandomRecipe() {
  recipeDisplay.innerHTML = "<p>Loading...</p>"; // Show loading message
  try {
    // Fetch a random recipe from the MealDB API
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
    const data = await res.json(); // Parse the JSON response
    const recipe = data.meals[0]; // Get the first recipe from the response
    currentRecipe = recipe; // Save the current recipe

    renderRecipe(recipe); // Show the recipe on the page

  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load a recipe.</p>";
  }
}

// This function sends the recipe and theme to OpenAI and displays the remix
async function remixRecipe() {
  // Get the remix output box
  const remixOutput = document.getElementById("remix-output");

  // Show a fun loading message in the remix box
  remixOutput.innerHTML = "<p>Remixing your recipe... Hang tight, chef! 🧑‍🍳✨</p>";

  // Get the remix theme from the input
  const theme = remixThemeInput.value;

  // Prepare the prompt for OpenAI
  const prompt = `
You are a creative chef! Remix this recipe with the theme "${theme}". 
Highlight any changed ingredients or instructions. 
Keep it short, fun, and doable for beginners!

Recipe JSON:
${JSON.stringify(currentRecipe)}
`;

  try {
    // Send the prompt to OpenAI's chat completions API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "You are a helpful and creative recipe remixer." },
          { role: "user", content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.8
      })
    });

    const data = await response.json();
    // Show the remixed recipe from the AI in the remix-output box
    remixOutput.innerHTML = `<h3>Remixed Recipe:</h3><p>${data.choices[0].message.content}</p>`;
  } catch (error) {
    remixOutput.innerHTML = "<p>Sorry, something went wrong with the remix. Please try again!</p>";
  }
}


// --- Step 4: Friendly Error Handling is already included in remixRecipe and fetchAndDisplayRandomRecipe ---

// --- Step 5: Save and Display Favorite Recipes ---

// Key for localStorage
const SAVED_RECIPES_KEY = "savedRecipes";

// Show or hide the saved recipes container and update the list
function updateSavedRecipesDisplay() {
  const savedRecipes = getSavedRecipes();
  const container = document.getElementById("saved-recipes-container");
  const list = document.getElementById("saved-recipes-list");
  list.innerHTML = ""; // Clear the list

  if (savedRecipes.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  // For each saved recipe, create a styled list item
  savedRecipes.forEach(recipeName => {
    const li = document.createElement("li");
    li.className = "saved-recipe-item";

    // Recipe name button (click to load)
    const nameBtn = document.createElement("button");
    nameBtn.textContent = recipeName;
    nameBtn.className = "saved-recipe-btn";
    nameBtn.title = "Show this recipe";
    nameBtn.addEventListener("click", () => loadSavedRecipe(recipeName));

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.className = "delete-btn";
    delBtn.title = "Delete this recipe";
    delBtn.addEventListener("click", () => deleteSavedRecipe(recipeName));

    li.appendChild(nameBtn);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

// Get saved recipes from localStorage
function getSavedRecipes() {
  const data = localStorage.getItem(SAVED_RECIPES_KEY);
  return data ? JSON.parse(data) : [];
}

// Save the current recipe name to localStorage
function saveCurrentRecipe() {
  if (!currentRecipe) return;
  const saved = getSavedRecipes();
  if (!saved.includes(currentRecipe.strMeal)) {
    saved.push(currentRecipe.strMeal);
    localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(saved));
    updateSavedRecipesDisplay();
  }
}

// Delete a recipe from localStorage
function deleteSavedRecipe(recipeName) {
  let saved = getSavedRecipes();
  saved = saved.filter(name => name !== recipeName);
  localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(saved));
  updateSavedRecipesDisplay();
}

// Load a saved recipe by name
async function loadSavedRecipe(recipeName) {
  recipeDisplay.innerHTML = "<p>Loading saved recipe...</p>";
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(recipeName)}`);
    const data = await res.json();
    if (data.meals && data.meals.length > 0) {
      const recipe = data.meals[0];
      currentRecipe = recipe;
      renderRecipe(recipe);
    } else {
      recipeDisplay.innerHTML = "<p>Sorry, couldn't find that recipe.</p>";
    }
  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load the recipe.</p>";
  }
}

// --- Load saved recipes list on page load ---
document.addEventListener("DOMContentLoaded", updateSavedRecipesDisplay);

// When the button is clicked, get and show a new random recipe
randomBtn.addEventListener("click", fetchAndDisplayRandomRecipe);


// When the Remix button is clicked, run the remix function
remixBtn.addEventListener("click", remixRecipe);

// When the page loads, show a random recipe right away
document.addEventListener("DOMContentLoaded", fetchAndDisplayRandomRecipe);