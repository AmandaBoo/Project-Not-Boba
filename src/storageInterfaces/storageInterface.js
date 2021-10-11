import * as localInterface from "./localInterface.js"
import * as serverInterface from "./serverSideInterface.js";

import {RawIngredient} from "../classes/ingredients/rawIngredient.js";
import {CraftedFoodIngredient} from "../classes/ingredients/craftedFoodIngredient.js";
import {FoodRecipe} from "../classes/foodRecipe.js";
import {IngredientAndQtyToObtainDto} from "../classes/dtos/ingredientAndQtyToObtain";
import {SORTED_FOOD_RECIPES} from "../storage/uiOrder";

export function setUpLocalStorage() {
    localInterface.setUpLocalStorage();
}
// retrieves raw ingredients from localStorageTemplates and local in json form
// and creates RawIngredient objects
export function getAllRawIngredients() {
    let allRawIngredients = [];
    let rawIngredientsLocal = localInterface.getRawIngredientsFromLocalStorage();
    let rawIngredientsServer = serverInterface.getRawIngredientsFromServer();

    rawIngredientsServer.forEach(ing => {
        let quantity = rawIngredientsLocal.find(ele => ele.name === ing.name).qty;
        allRawIngredients.push(new RawIngredient(ing.name, quantity, ing.src, ing.rarity, ing.obtainedBy));
    });
    return allRawIngredients;
}

// retrieves food ingredients from localStorageTemplates and local in json form
// and creates FoodIngredient objects
export function getAllCraftedFoodIngredients(allRawIngredients) {
    let allFoodIngredients = [];
    let foodIngredientsLocal = localInterface.getFoodIngredientsFromLocalStorage();
    let foodIngredientsServer = serverInterface.getFoodIngredientsFromServer();

    foodIngredientsServer.forEach(ing => {
        let quantity = foodIngredientsLocal.find(ele => ele.name === ing.name).qty;
        let craftsFromRaw = mapRawIngredients(allRawIngredients, ing)
        allFoodIngredients.push(new CraftedFoodIngredient(ing.name, quantity, ing.src, ing.rarity, ing.obtainedBy,craftsFromRaw));
    });
    return allFoodIngredients;
}

function mapRawIngredients(allRawIngredients, foodIngredient) {
    let allRawIngredientRecipes = [];

    // iterate over each possible way of making foodIngredient
    for (let i = 0; i < foodIngredient.craftsFrom.length; i++) {
        let temp = [];

        // iterate over each ingredient within sub recipe
        foodIngredient.craftsFrom[i].forEach(rawIngredient => {
            let tempObj = {ingredient: 0, qtyRequired: 0};

            // find RawIngredient whose name matches
            tempObj.ingredient = allRawIngredients.find(ele => ele.name === rawIngredient.name);
            tempObj.qtyRequired = foodIngredient.craftsFrom[i].find(ele => ele.name === rawIngredient.name).qty;
            temp.push(tempObj);
        });
        allRawIngredientRecipes.push(temp);
    }
    return allRawIngredientRecipes;
}

// retrieves recipe ingredients from localStorageTemplates and local in json form
// and creates FoodRecipe objects
export function getAllFoodRecipes(sortByUI = false) {
    let allRawIngredients = getAllRawIngredients();
    let allRawIngredientsCopy = getAllRawIngredients();
    let allCraftedIngredients = getAllCraftedFoodIngredients(allRawIngredients);
    let allCraftedIngredientsCopy = getAllCraftedFoodIngredients(allRawIngredients);
    let allRecipes = [];
    let foodRecipeLocal = localInterface.getFoodRecipesFromLocalStorage();
    let foodRecipeServer = serverInterface.getFoodRecipesFromServer();

    foodRecipeLocal.sort((recipe1, recipe2) => {
        return recipe1.rank - recipe2.rank;
    });

    foodRecipeLocal.forEach(localFoodRecipe => {
        let serverFoodRecipe = foodRecipeServer.find(ele => ele.name === localFoodRecipe.name);
        let allCraftsFrom;
        [allCraftsFrom, allRawIngredientsCopy, allCraftedIngredientsCopy] = mapRawAndCraftedIngredients(allRawIngredients, allCraftedIngredients, serverFoodRecipe, localFoodRecipe, allRawIngredientsCopy, allCraftedIngredientsCopy);
        allRecipes.push(new FoodRecipe(serverFoodRecipe.name, localFoodRecipe.qty, serverFoodRecipe.src, localFoodRecipe.want, localFoodRecipe.mastery,
            localFoodRecipe.curProf, serverFoodRecipe.rarity, allCraftsFrom, localFoodRecipe.hasCard, localFoodRecipe.enabled, localFoodRecipe.rank));
    });

    return allRecipes;
}

function mapRawAndCraftedIngredients(allRawIngredients, allCraftedFoodIngredients, recipeServer, recipeLocal, allRawIngredientsCopy, allCraftedIngredientsCopy) {
    let allRawAndCraftedRecipes = [];

    // iterate over each possible way of making recipe
    for (let i = 0; i < recipeServer.craftsFrom.length; i++) {
        let rawAndCraftTemp = [];
        let rawTemp = [];
        let craftTemp = [];

        // iterate over each ingredient within sub recipe
        recipeServer.craftsFrom[i].forEach(recipeIngredient => {
            let rawObj = {ingredient: 0, qtyRequired: 0, qtyToObtain: 0};
            let craftObj = {ingredient: 0, qtyRequired: 0, qtyToObtain: 0};

            // determine if ingredient is raw or crafted
            rawObj.ingredient = allRawIngredients.find(ele => ele.name === recipeIngredient.name);
            craftObj.ingredient = allCraftedFoodIngredients.find(ele => ele.name === recipeIngredient.name);

            if (rawObj.ingredient !== undefined) {
                rawObj.qtyRequired = recipeServer.craftsFrom[i].find(ele => ele.name === recipeIngredient.name).qty;
                [rawObj.qtyToObtain, allRawIngredientsCopy] = determineQtyToObtain(recipeLocal, rawObj.ingredient, rawObj.qtyRequired, allRawIngredientsCopy);
                rawTemp.push(rawObj);
            }
            if (craftObj.ingredient !== undefined) {
                craftObj.qtyRequired = recipeServer.craftsFrom[i].find(ele => ele.name === recipeIngredient.name).qty;
                [craftObj.qtyToObtain, allCraftedIngredientsCopy] = determineQtyToObtain(recipeLocal, craftObj.ingredient, craftObj.qtyRequired, allCraftedFoodIngredients);
                craftTemp.push(craftObj);
            }
        });
        rawAndCraftTemp.push({raw : rawTemp});
        rawAndCraftTemp.push({crafted:craftTemp});
        allRawAndCraftedRecipes.push(rawAndCraftTemp);
    }
    return [allRawAndCraftedRecipes, allRawIngredientsCopy, allCraftedIngredientsCopy];
}

function determineQtyToObtain(recipe, ingredient, qtyRequired, allIngredients) {
    if (!recipe.hasCard || (recipe.hasCard && !recipe.enabled)) {
        return [0, allIngredients];
    }
    let inventoryQty = allIngredients.find(ele => ele.name === ingredient.name).qty;
    let totalNeeded = recipe.want * qtyRequired;
    let totalLeftToGather = 0;

    if (inventoryQty - totalNeeded > 0) {
        // inventory has enough and user doesn't need to collect anymore
        inventoryQty -= totalNeeded;
    } else {
        // inventory does not have enough and user may need some partial amount more
        totalLeftToGather = totalNeeded - inventoryQty;
        inventoryQty = 0;
    }

    // update running inventory total
    allIngredients.find(ele => ele.name === ingredient.name).qty = inventoryQty;

    return [totalLeftToGather, allIngredients];
}

export function getIngredientToObtainDTOList(recipes, ingredientType) {
    let ingredientDTOList = [];
    let ingredientMap = new Map();
    recipes.forEach(recipe => {
        if (recipe.hasCard && recipe.enabled) {
            recipe.craftsFrom.forEach(subRecipe => {
                let subRecipeIngredientList;
                if (ingredientType === "raw") {
                    subRecipeIngredientList = subRecipe[0].raw;
                } else if (ingredientType === "crafted") {
                    subRecipeIngredientList = subRecipe[1].crafted;
                }
                subRecipeIngredientList.forEach(entry => {
                    let qtyToObtainInSum;
                    if (ingredientMap.get(entry.ingredient)) {
                        qtyToObtainInSum = (ingredientMap.get(entry.ingredient) + (entry.qtyRequired * recipe.want));
                    } else {
                        qtyToObtainInSum = (entry.qtyRequired * recipe.want);
                    }
                    ingredientMap.set(entry.ingredient, qtyToObtainInSum);
                });
            });
        }
    });

    ingredientMap.forEach((qtyToObtainInSum, ingredient) => {
        let qtyLeftToObtain = ingredient.qty - qtyToObtainInSum;
        if (qtyLeftToObtain < 0) {
            // inventory does not have enough and user may need some partial amount more
            ingredientDTOList.push(new IngredientAndQtyToObtainDto(ingredient, qtyToObtainInSum - ingredient.qty));
        } else {
            // inventory has enough so user does not have to gather anymore
            ingredientDTOList.push(new IngredientAndQtyToObtainDto(ingredient, 0));
        }
    });

    return ingredientDTOList;
}

export function sortIngredientsByUIOrder(rawAndCraftedIngredients) {

}

export function sortFoodRecipesByUIOrder(foodRecipes) {
    foodRecipes.sort(function(a, b){
        return SORTED_FOOD_RECIPES.indexOf(a.name) - SORTED_FOOD_RECIPES.indexOf(b.name);
    });
    return foodRecipes;
}

export function saveIngredients(rawIngredients, foodIngredients) {
    localInterface.setRawIngredientsInLocalStorage(rawIngredients);
    localInterface.setFoodIngredientsInLocalStorage(foodIngredients);
}

export function saveFoodRecipes(foodRecipes) {
    localInterface.setFoodRecipesInLocalStorage(foodRecipes);
}
