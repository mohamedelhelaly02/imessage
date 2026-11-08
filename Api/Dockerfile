FROM mcr.microsoft.com/dotnet/sdk:10.0 as build

WORKDIR /src

COPY Api.csproj ./

RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 as final

WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 80
EXPOSE 443

ENTRYPOINT ["dotnet", "Api.dll"]