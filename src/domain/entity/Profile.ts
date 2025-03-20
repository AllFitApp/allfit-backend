export class Profile {
    id: string;
    name: string;
    email: string;
    age: number;
    alunos: number;
    description: string;
    niche: string;
    followers: number;
    rate: number;
    avatar: string;

    constructor(
        id: string,
        name: string,
        email: string,
        age: number,
        alunos: number,
        description: string,
        niche: string,
        followers: number,
        rate: number,
        avatar: string
    ) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.age = age;
        this.alunos = alunos;
        this.description = description;
        this.niche = niche;
        this.followers = followers;
        this.rate = rate;
        this.avatar = avatar;
    }

    updateProfile(
        name: string,
        email: string,
        age: number,
        alunos: number,
        description: string,
        niche: string,
        followers: number,
        rate: number,
        avatar: string
    ): void {
        this.name = name;
        this.email = email;
        this.age = age;
        this.alunos = alunos;
        this.description = description;
        this.niche = niche;
        this.followers = followers;
        this.rate = rate;
        this.avatar = avatar;
    }
}