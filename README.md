# gatsby-wp-gravty-form
A form builder component that takes Gravity Forms data and outputs a form that validates and sends form submissions back to the REST API

## Dependencies
* WordPress
* Gravity Forms
* React.js
* Gatsby.js
* Axios
* React Spinners

## How it works
There are probably better ways to query your WordPress data and get a form based on the form ID but I haven't had the time to really figure that out.

### On the WordPress admin side
Drop a Gravity Forms gutenberg block into your page or post and select the appropriate form

### On the Gatsby side
In your GraphQL query for pages and posts, make sure that you're querying for GF blocks and get the form ID from the returned data. Pass the ID along to the FormBuilder in the formId prop. 

Query all your forms, as well, and pass that data to the FormBuilder in the formData prop. The component will compare the two props and return the correct form based on the result.

Still a little buggy in the validation section but but it's at a point where you can just drop it in to your app, provide the props, and style the elements.