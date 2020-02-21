import {
    JsonPrimitiveType,
    Base64PrimitiveType,
    BoolPrimitiveType,
    BytesPrimitiveType,
    CepPrimitiveType,
    CnpjPrimitiveType,
    CpfPrimitiveType,
    DatePrimitiveType,
    DateTimePrimitiveType,
    EmailPrimitiveType,
    FloatPrimitiveType,
    HexPrimitiveType,
    IntPrimitiveType,
    LatLngPrimitiveType,
    MoneyPrimitiveType,
    PhonePrimitiveType,
    SafeHtmlPrimitiveType,
    StringPrimitiveType,
    UIntPrimitiveType,
    UrlPrimitiveType,
    UuidPrimitiveType,
    VoidPrimitiveType,
    XmlPrimitiveType,
} from "./ast";

export const primitiveToAstClass = new Map<string, any>();
primitiveToAstClass.set("string", StringPrimitiveType);
primitiveToAstClass.set("int", IntPrimitiveType);
primitiveToAstClass.set("uint", UIntPrimitiveType);
primitiveToAstClass.set("date", DatePrimitiveType);
primitiveToAstClass.set("datetime", DateTimePrimitiveType);
primitiveToAstClass.set("float", FloatPrimitiveType);
primitiveToAstClass.set("bool", BoolPrimitiveType);
primitiveToAstClass.set("bytes", BytesPrimitiveType);
primitiveToAstClass.set("money", MoneyPrimitiveType);
primitiveToAstClass.set("cpf", CpfPrimitiveType);
primitiveToAstClass.set("cnpj", CnpjPrimitiveType);
primitiveToAstClass.set("email", EmailPrimitiveType);
primitiveToAstClass.set("phone", PhonePrimitiveType);
primitiveToAstClass.set("cep", CepPrimitiveType);
primitiveToAstClass.set("latlng", LatLngPrimitiveType);
primitiveToAstClass.set("url", UrlPrimitiveType);
primitiveToAstClass.set("uuid", UuidPrimitiveType);
primitiveToAstClass.set("hex", HexPrimitiveType);
primitiveToAstClass.set("base64", Base64PrimitiveType);
primitiveToAstClass.set("safehtml", SafeHtmlPrimitiveType);
primitiveToAstClass.set("xml", XmlPrimitiveType);
primitiveToAstClass.set("json", JsonPrimitiveType);
primitiveToAstClass.set("void", VoidPrimitiveType);
