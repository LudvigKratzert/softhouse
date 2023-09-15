
// Hej! Välkomna till mitt kodprov.
// Här är några begränsningar som jag medvetet har gjort:
// Jag verifierar inte att en rads innehåll är av rätt typ (t.ex. telefonnummerformat, endast legala tecken i namn)
// Det är tillåtet att ha för få element i en given tagg, men inte för många eller inga.
// Jag har inte tagit någon hänsyn till säkerhet så XSS är fullt möjligt. Dock påverkar man ju bara sin egen dator.
// Jag har inte skapat en distinktion mellan barn-element som bara ska förekomma en gång (telefon) och
//      som får förekomma flera gånger (familjemedlemmar).
// Jag har lagt allting i en fil för enkelhetens skull.
// Jag valde att ta input via en textruta i stället för att faktiskt läsa en fil,
//      det kändes inte som det viktiga med uppgiften. (Men går ju lätt att lägga till)

class XMLBuilder {
  constructor(rules) {
    // A dictionary of rules describing the different types of xml elements that are allowed.
    this.rules = rules;
    // A string containing the xml being built.
    this.xml = "";
    // A stack containing the rules of all currently open elements.
    this.parents = [];
    // A bool, true if the first line of XML has been written. Used to avoid an initial line break.
    this.firstLineHasBeenWritten = false;
  }

  // Parses a single row of input.
  parseRow(row) {
    // Split the row into elements and identify its type.
    let elements = row.split("|");
    const type = elements.shift();

    // Close all open elements until we reach a level where this type is permitted.
    while (this.immediateParent !== undefined && !this.immediateParent.children.includes(type)) {
      this.closeElement();
    }

    // Create the xml.
    const rules = this.rules[type];
    this.openElement(rules, rules.name);
    elements.forEach((element, i) => {
      this.addSingleLineElement(rules.elements[i], element);
    });
  }

  // Returns the rules of the currently open element, which is the immediate parent of any xml elements being added.
  get immediateParent() {
    return this.parents.at(-1);
  }

  // Adds closing tags to all open elements. Used when all XML has been read.
  closeAllElements() {
    while (this.parents.length > 0) {
      this.closeElement();
    }
  }

  // Opens a new element, e.g. <person>
  openElement(rules) {
    this.addLine(`<${rules.name}>`);
    this.parents.push(rules);
  }

  // Adds a closing tag to the currently open element, e.g. </person>
  closeElement() {
    if (this.parents.length === 0) {
      // There are no open elements to close.
      return;
    }
    const name = this.parents.pop().name;
    this.addLine(`</${name}>`);
  }

  // Opens and closes a leaf node element, with content. E.g. <mobile>0708990891</mobile>
  addSingleLineElement(name, content) {
    this.addLine(`<${name}>${content}</${name}>`);
  }

  // Adds a new line to the XML, creating a newline and indentation.
  addLine(line) {
    if (!this.firstLineHasBeenWritten) {
      // Do not add a newline or indentation for the first line of the document.
      this.firstLineHasBeenWritten = true;
      this.xml += line;
      return;
    }
    this.newLine();
    this.addIndentations();
    this.xml += line;
  }

  // Creates a line break in the XML.
  newLine() {
    this.xml += "\n";
  }

  // Adds n * 5 spaces, making n levels of indentation.
  addIndentations() {
    for (const parent in this.parents) {
      this.xml += "     ";
    }
  }
}

// A dictionary mapping input tags to descriptions of xml elements.
const xmlRules = {
  'P': {
    // The name of this xml element, shown in its tags.
    name: "person",
    // The names of the xml elements that can be added as leaf nodes inside this element.
    elements: ["firstname", "lastname"],
    // The keys of the xml elements that can be added inside this element and have children of their own.
    children: ['T', 'A', 'F'],
  },
  'F': {
    name: "family",
    elements: ["firstname", "born"],
    children: ['T', 'A'],
  },
  'A': {
    name: "address",
    elements: ["street", "city", "zipcode"],
    children: [],
  },
  'T': {
    name: "phone",
    elements: ["mobile", "landline"],
    children: [],
  }
}

// The rules for the root node element <people>
const rootElementRules = {
  name: "people",
  elements: [],
  children: ['P'],
}

// Takes the input, split into rows, and returns true if the input is valid.
function validateInput(rows, rules) {
  // Check if the input is empty.
  if (rows === undefined || rows.length === 1 && rows[0] === "") {
    alert("The input is empty.");
    return false;
  }
  // Check that all rows begin with a valid type.
  const types = rows.map((row) => row[0]);
  const invalidTypes = types.filter(type => !(type in rules));
  if (invalidTypes.length > 0) {
    alert(`The input contains the invalid types: ${invalidTypes}. Please correct the input and try again.`);
    return false;
  }

  // Check that each row's elements are valid.
  for (let i = 0; i < rows.length; i++) {
    let elements = rows[i].split("|");
    const type = elements.shift();
    if (!validateRow(elements, rules[type], i)) {
      return false;
    }
  }

  // The input is valid.
  return true;
}

// Verifies that a list of elements matches the given rules. Return true if it does, false if not.
// Also outputs warnings if the input is invalid.
function validateRow(elements, rules, rownumber) {
  let message = "";
  if (elements.length > rules.elements.length) {
    message += `Row ${rownumber} contains too many elements.\n`;
  }
  if (elements.length === 0) {
    message += `Row ${rownumber} contains no elements.\n`;
  }
  if (elements.some(element => element === "")) {
    message += `Row ${rownumber} contains at least one empty element.\n`;
  }
  if (message !== "") {
    message += "Please correct the input and try again."
    alert(message);
    return false;
  }
  return true;
}

// Gets the user input, splits it into rows and returns the non-empty rows as a list.
function getInputRows() {
  const input = document.getElementById("inputField").value;
  const rows = input.split(/\r?\n/);
  return rows.filter(row => row !== "");
}

function main() {
  // Get the user input.
  rows = getInputRows();

  // Check if the input is valid.
  if (!validateInput(rows, xmlRules)) {
    return;
  }

  // Create the XMLBuilder.
  let builder = new XMLBuilder(xmlRules);

  // Create the root node element.
  builder.openElement(rootElementRules);

  // Parse all rows.
  rows.forEach((row) => {
    builder.parseRow(row);
  });

  // Close any open elements.
  builder.closeAllElements();

  // Present the result.
  document.getElementById("outputField").value = builder.xml;
}
