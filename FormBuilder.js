import React, { Component } from 'react'
import axios from 'axios'
import ScaleLoader from "react-spinners/ScaleLoader";

/*
	This is not as slick as I would like it to be but it's a good start toward something more dynamic. Forms (or anything
	that requires an interaction with the server, for that matter) are a tricky thing in Gatsby because of the nature of
	static sites. To remedy this we use Axios, which is a small library that greatly simplifies making AJAX requests.
*/
class FormBuilder extends Component {
    constructor(props) {
        super(props)
        this.state = {
			'blacklist': [],
			'formSending': false,
            'formInvalid': false,
            'formFields': props.formData[0].node.formFields.nodes, // Receives form field data from props.formData
            'postnobills': {
                'valid': true, // This is a honeypot, so it fails on a false value
                'value': ''
            }
        }

        // Bind our functions
		this.emailBlacklist = this.emailBlacklist.bind(this)
		this.findLinksInBody = this.findLinksInBody.bind(this)
        this.handleChange = this.handleChange.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
        this.isEmailValid = this.isEmailValid.bind(this)
		this.isPhoneValid = this.isPhoneValid.bind(this)
        this.validateForm = this.validateForm.bind(this)
        this.validationMessage = this.validationMessage.bind(this)
    }

	/*
		Fetch a list bad email domains to compare the submitted email address to
	*/
	emailBlacklist = () => {
		const blacklistUrl = 'https://gist.githubusercontent.com/TheeBryanWhite/0c8e783f00537def019ff47a7c91ef39/raw/e81212c3caecb54b87ced6392e0a0de2b6466287/temporary-email-address-domains'
		const self = this
		axios.get(blacklistUrl, {}).then((response) => {
			const blacklist = response.data.split('\n')
			self.setState({blacklist: blacklist})
		}).catch(error => {
			console.log(error)
		})

		return false
	}

	/*
		This function sifts through the message body and looks for links.  No links allowed. 
        The submission is likely spam if it contains a link. Delete or comment the function call 
        out if your field needs to allow links.
	*/
	findLinksInBody = (body) => {
		const pattern = /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/; // eslint-disable-line no-useless-escape
		return pattern.test(body)
	}

    /*
		Whenever a form field value changes we run this function and depending on which input is updating, 
        its value is mapped to that state variable. Could probably use a debounce.
	*/
    handleChange = (event) => {
        const target = event.target
        const value = target.value
        const name = target.name

        Object.entries(this.state.formFields).map((field) => {
            if (name === field[1].label) {
                const formFields = [...this.state.formFields]
                formFields[field[0]].value = value;
                formFields[field[0]].valid = false;
                this.setState({formFields})
            }
            return false
        })

        /* 
            Remove the invalid classes on the input fields. This is leftover from a previous version 
            of this component that sent to Ninja Forms () and I honestly can't remember if I still need it.
        */
        document.getElementById(name).classList.remove('invalid')
        document.getElementById(name).classList.remove('email-invalid')
    }

    /*
		This is where things get interesting. On submit we:
	*/
    handleSubmit = (event) => {
        event.preventDefault()

        // Set the vars for the submission endpoint
        const ENDPOINT = `wp-json/gf/v2/forms/${this.props.formId}/submissions`
        const HOST = process.env.HOST
        
        const submitUrl = `https://${HOST}/${ENDPOINT}`
        
        // format the form data from the state object to a JSON object compatible with the endpoint
        const formBody = () => {
            let postBody = {}
            this.state.formFields.map((field) => {
                // example post body
                // input_1 refers to the field with an id of 1
                // therefore, each field is named input_[ID]
                // fields formatted like this input_[PARENT_ID]_[CHILD_ID] indicate a form field with child fields
                // {
                //     "input_1":      "test",
                //     "input_3_3" :   "Rocket",
                // }
                postBody[`input_${field.id}`] = field.value
            })
            return postBody
        }

        // Then we check to see if stupid bots are filling out the form
        if (!this.state.postnobills.length > 0) {
            const formData = this.state.formFields
            
            // Validate the form input
            const isThisValid = this.validateForm(formData)

            // If no bueno we bail out
            if (!isThisValid) {
                return false
            }

			this.setState({'formInvalid': false})
			this.setState({'formSending': true})

            // If it's all good, we send a request to the API and let WordPress take it from there.
            axios.post(
				submitUrl, 
				formBody(), 
                {
                    auth: {
                        username: 'kilpatrick',
                        password: '?qK]f8K%o597'
                    },
					'Access-Control-Allow-Origin': '*'
				}
				).then(response => {
                /*
                    If the API returns a successful response, switch out the form component for whatever our success message is. 
                    We can also use Gatsby Link to set the route to a success page if we want to.
                */
                this.setState({'contactFormSubmit': true})
				this.setState({'formSending': false})
            }).catch(error => {
                // Otherwise, throw an error. Sad Christmas.
                console.log(error)
            })
        } else {
            // No bots allowed.
            console.log("See you space cowboy")
        }
    }

    /*
        This function compares the submitted email input to a regex pattern matching valid emails. 
        I know that some folks like to restrict submissions to work emails so we can blacklist gmail, hotmail, yahoo, etc.
    */
    isEmailValid = (email) => {
        const pattern = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z0-9_\-\.]+)$/;  // eslint-disable-line no-useless-escape
        return pattern.test(email.toLowerCase())
    }

	isPhoneValid = (phone) => {
		const pattern = /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$/;  // eslint-disable-line no-useless-escape
        return pattern.test(phone)
    }

    validateForm = (formData) => {
        // Shoot through the form values
        // Set the valid status to false if any fields are blank
        // Add the invalid class to the relevant input
        for (const data in formData) {
			switch(formData[data].label) {
                case 'Email':

					const domain = formData[data].value.split('@')
					let blacklisted = false

					this.state.blacklist.map((curr) => {
						if (curr === domain[1])  {
							blacklisted = true
						}
						return false
					})
	
					if (blacklisted) {
						this.setState({'formInvalid': true}, () => {
							formData[data].valid = false
							document.getElementById(formData[data].label).parentNode.classList.add('invalid')
						})
					} else {
						this.setState({'formInvalid': false})
					}

					if (
						!this.isEmailValid(formData[data].value) || 
						formData[data].value === ''
					) {
						this.setState({'formInvalid': true}, () => {
							formData[data].valid = false
							document.getElementById(formData[data].label).parentNode.classList.add('invalid')
						})
                    } else {
                        document.getElementById(formData[data].label).parentNode.classList.remove('invalid')
						formData[data].valid = true
					}
                    break
                
                case 'Phone':
					if (
						!this.isPhoneValid(formData[data].value) || 
						formData[data].value === ''
					) {
						this.setState({'formInvalid': true}, () => {
                            formData[data].valid = false
							document.getElementById(formData[data].label).parentNode.classList.add('invalid')
						})
                    } else {
                        document.getElementById(formData[data].label).parentNode.classList.remove('invalid')
						formData[data].valid = true
					}
                    break
                
                case 'Message':
                    console.log(formData[data].value)
					if (
						this.findLinksInBody(formData[data].value) || 
						formData[data].value === ''
					) {
						this.setState({'formInvalid': true}, () => {
							formData[data].valid = false
							document.getElementById(formData[data].label).parentNode.classList.add('invalid')
						})
                    } else {
                        document.getElementById(formData[data].label).parentNode.classList.remove('invalid')
						formData[data].valid = true
					}
                    break
                
                case 'postnobills':
					if (formData[data].value.length > 0) {
						console.log('see you space cowboy')
						this.setState({'formInvalid': true})
					}
                    break
                
                default:
					if (formData[data].value === null) {
						this.setState({'formInvalid': true}, () => {
							formData[data].valid = false
							document.getElementById(formData[data].label).parentNode.classList.add('invalid')
						})
                    } else {
                        document.getElementById(formData[data].label).parentNode.classList.remove('invalid')
						formData[data].valid = true
					}
			}
        }

        let allValid

        for (const data in formData) {
            console.log(formData[data])
            if (formData[data].valid === false) {
                allValid = false
                return false
            } else {
                allValid = true
            }
        }

		return allValid
    }

    // Static value for right now. But we can set this to whatever the Ninja Forms form data sends over.
    validationMessage = () => { 
        return 'Please enter correct data...'
    }

    componentDidMount() {
        // This grabs the email blacklist data and stuffs in state to compare on later
        this.emailBlacklist()
	}

    render() {
		let validationMsg = null
		if (this.state.formInvalid) {
			validationMsg = <div className="validation-msg"><p>There are some items that need your attention</p></div>
        }
        
        let SubmitButton

        if (!this.state.contactFormSubmit && this.props.formData !== undefined) {
			return (
				<form className="gform" onSubmit={this.handleSubmit}>
					{validationMsg}
					<div>
					{
						/*
							This function loops through the form field data that comes in o ur GraphQL query. Right now i
                            t only returns textbox inputs and textareas but we can add more types as this gets used more often.
						*/
                            this.state.formFields.map((field) => {
                            if (!this.state.formSending) {
                                SubmitButton = <div className="submit-button">
                                            <button type="submit">{this.props.formData[0].node.button.text}</button>
                                        </div>
                            } else {
                                SubmitButton = <div className="submit-button">
                                            <button disabled type={this.props.formData[0].node.button.text}>
                                                <ScaleLoader />
                                            </button>
                                        </div>
                            }
                            let formField = null

                            if (
                                field.type === 'text' ||
                                field.type === 'textbox' ||
                                field.type === 'email' ||
                                field.type === 'phone'
                                ) {
                                formField = <div className="inputs" key={field.id}>
                                                <label htmlFor={field.label}>{field.label}</label>
                                                <input
                                                    id={field.label}
                                                    name={field.label}
                                                    onChange={this.handleChange}
                                                    placeholder={field.placeholder}
                                                    type={field.type}
                                                    value={field.value === null ? '' : field.value}
                                                />
                                                <p className="validation-message">{this.validationMessage()}</p>
                                            </div>
                            }

                            if (field.type === 'textarea') {
                                formField = <div className="inputs" key={field.id}>
                                                <label htmlFor={field.label}>{field.label}</label>
                                                <textarea
                                                    id={field.label}
                                                    name={field.label}
                                                    onChange={this.handleChange}
                                                    placeholder={field.placeholder}
                                                    value={field.value === null ? '' : field.value}
                                                />
                                                <p className="validation-message">{this.validationMessage()}</p>
                                            </div>
                            }

                            if (!field.type) {
                                formField = <div key="postnobills">
                                                <input
                                                    className="postnobills"
                                                    id="postnobills"
                                                    key="xxx"
                                                    name="postnobills"
                                                    onChange={this.handleChange}
                                                    placeholder="postnobills"
                                                    type="text"
                                                    value={this.state.postnobills.value}
                                                />
                                            </div>
                            } 
                                
                        return formField
                        })
                    }
                        {SubmitButton}
					</div>
				</form>
				)
			} else {
				return (
					<div>
						<h2>Thank you for reaching out to us! Your message has been received and we will respond as soon as we can.</h2>
					</div>
				)
			}
		}
    }

export default FormBuilder
