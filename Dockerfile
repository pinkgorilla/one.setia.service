FROM microsoft/aspnetcore:2.0.0-stretch
WORKDIR App
# EXPOSE 80
COPY ./bin/publish/. . 
CMD ["dotnet","One.Setia.Service.WebApi.dll"]