/**
 * Cloudflare Workers Internship Application: Full-Stack
 * by Juan Manuel Alonso
 * 17 March 2020
 * 
 * Using Cloudflare Workers, this work consists of an application that will randomly send users to one of two webpages.
 * This project makes use of the Cloudflare Workers API, managing and developing via the command-line tool Wrangler, 
 * and deploying it to the free workers.dev deployment playground.
*/

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Custom ElementHandler class to responds to any incoming element, such as title, description.
 */
class ElementHandler {
  constructor(content) {
    this.content = content;
  }

  element(element) {
    element.setInnerContent(this.content);
  }
}

/**
 * Custom ElementHandler class to replace an attribute, such as href.
 */
class AttributeHandler {
  constructor(attribute_name, old_attribute_content, new_attribute_content) {
    this.attributeName = attribute_name;
    this.oldAttributeContent = old_attribute_content;
    this.newAttributeContent = new_attribute_content;
  }

  element(element) {
    const attribute = element.getAttribute(this.attributeName);
    if (attribute) {
      element.setAttribute(this.attributeName, attribute.replace(this.oldAttributeContent, this.newAttributeContent))
    }
  }
}

/**
 * Custom HTMLRewriter class to change variants.
 */
class CustomHTMLRewriter {

  constructor(author, random_number, url_description, old_attribute_content, new_attribute_content) {
    this.author = author;
    this.randomNumber = random_number;
    this.urlDescription = url_description;
    this.oldAttributeContent = old_attribute_content;
    this.newAttributeContent = new_attribute_content;
  }

  get() {
    return new HTMLRewriter()
      .on('title', new ElementHandler(this.author))
      .on('h1#title', new ElementHandler('Variant #' + this.randomNumber))
      .on('p#description', new ElementHandler('This is variant ' + this.randomNumber + ' of ' + this.author + '\'s work'))
      .on('a#url', new ElementHandler(this.urlDescription))
      .on('a', new AttributeHandler('href', this.oldAttributeContent, this.newAttributeContent));
  }

}

/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  // Request the URLs from the API
  let requestURL = new URL("https://cfw-takehome.developers.workers.dev/api/variants");

  let variants = await fetch(requestURL)
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      return json.variants;
    });

  const GITHUB_VARIANT = 0;
  const PORTFOLIO_VARIANT = 1;

  // Changing variants with HTMLRewriter API
  const GITHUB_REWRITER = new CustomHTMLRewriter('J. Alonso', GITHUB_VARIANT, 'Visit my GitHub page',
    'https://cloudflare.com', 'https://github.com/j1nma')
    .get();

  const PORTFOLIO_REWRITER = new CustomHTMLRewriter('J. Alonso', PORTFOLIO_VARIANT, 'Checkout my personal portfolio',
    'https://cloudflare.com', 'https://j1nma.com')
    .get();

  // Persisting variants
  const NAME = 'variant';
  const cookie = request.headers.get('Cookie');

  if (cookie && cookie.includes(`${NAME}=${GITHUB_VARIANT}`)) {

    let response = await fetch(variants[GITHUB_VARIANT]);
    return GITHUB_REWRITER.transform(response);

  } else if (cookie && cookie.includes(`${NAME}=${PORTFOLIO_VARIANT}`)) {

    let response = await fetch(variants[PORTFOLIO_VARIANT]);
    return PORTFOLIO_REWRITER.transform(response);

  } else {
    // User visits the site and the cookie is not present

    // Request a random variant:
    // From MDN web docs: "Math.random() function returns a floating-point, pseudo-random number 
    // in the range 0 to less than 1 (inclusive of 0, but not 1) with approximately uniform distribution over that range"
    const randomNumber = Math.floor(Math.random() * variants.length);
    const randomVariant = variants[randomNumber];

    let VARIANT = randomNumber < 0.5 ? GITHUB_VARIANT : PORTFOLIO_VARIANT;
    let REWRITER = randomNumber < 0.5 ? GITHUB_REWRITER : PORTFOLIO_REWRITER;

    let response = await fetch(randomVariant);
    response = REWRITER.transform(response);
    response.headers.append('Set-Cookie', `${NAME}=${VARIANT}; path=/;`);
    return response;
  }
}
