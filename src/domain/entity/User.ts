import { v4 as uuidv4 } from 'uuid';
export default class User {
	constructor(
		readonly name: string,
		readonly username: string,
		readonly password: string,
		readonly number: string,
		readonly email: string,
		readonly role: string = 'USER',
		readonly cpf?: string,
		readonly id: string = uuidv4()
	) {}
}
