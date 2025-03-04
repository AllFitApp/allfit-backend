import axios, { AxiosInstance } from "axios"

let client: AxiosInstance;

beforeEach(function () {
    client = axios.create({
        baseURL: 'http://localhost:3002'
    });
})

test('Should create user', async function () {
    try {
        const json = JSON.stringify({
            username: 'vitor',
            email: 'vitor@teste.com',
            password: 'vitor@teste',
            name: 'Vitor Teste',
            role: 'ADMIN',
            number: '4999999999',
        });
        const output = await client.post('/auth/signup', {
            data:
            {
                username: 'vitor',
                email: 'vitor@teste.com',
                password: 'vitor@teste',
                name: 'Vitor Teste',
                role: 'ADMIN',
                number: '4999999999',
            }
        })
        console.log(output.data);
        expect(output.status).toBe(200);
        expect(output.data.username).toBe('vitor');
    } catch (error: any) {
        console.error('Erro no teste:', error.response?.data || error.message);
        throw error;
    }
});
