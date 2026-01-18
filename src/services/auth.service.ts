import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from "bcrypt";
import { Repository } from 'typeorm';
import axios from "axios";
import { InjectRepository } from '@nestjs/typeorm';
import { AuthHistoryEntity } from 'src/database/entities/AuthHistoryEntity';

@Injectable()
export class AuthService {
  @InjectRepository(AuthHistoryEntity) private authSessionRepository: Repository<AuthHistoryEntity>

  constructor(
    private jwtService: JwtService
  ) { }

  public generateJWT(data: any, expiresIn: string | number = "7d"): string {
    return this.jwtService.sign(data, {
      secret: process.env.JWT_KEY,
      expiresIn: expiresIn
    })
  }

  public verifyJWT(jwt: string) {
    return this.jwtService.verify(jwt, {
      secret: process.env.JWT_KEY,
    });
  }

  public decodeJWT(jwt: string) {
    return this.jwtService.decode(jwt);
  }

  public bcryptHashSync(text: string): string {
    return bcrypt.hashSync(text, 12);
  }

  public bcryptCompareSync(encrypted: string, data: string): boolean {
    return bcrypt.compareSync(data, encrypted);
  }

  public async authLog(userId: string, request: Request) {
    const ip = request["clientIp"];
    const userAgent = request.headers["x-user-agent"] || request.headers["user-agent"] || "Desconhecido";
    let locationJson: string | null = null;

    if (ip) {
      try {
        const { data } = await axios.get(`https://api.geoapify.com/v1/ipinfo?ip=${ip}&apiKey=${process.env.GEOAPIFY_API_KEY}`);
        if (data.city) {
          locationJson = JSON.stringify({
            city: data.city.name,
            continent: data.continent.names["pt-BR"],
            country: data.country.names["pt-BR"],
            flag: data.country.flag,
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            state: data.state.name,
            source: "Geoapify",
          })
        }
      } catch (error) {
        console.log(`[Auth log error]: ${error.message}`)
      }
    }


    await this.authSessionRepository.save({
      userId: userId,
      ip: ip,
      userAgent: userAgent,
      locationJson: locationJson
    })
  }
}
